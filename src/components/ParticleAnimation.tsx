import React, { useRef, useEffect } from 'react'; // import React + hooks
import * as THREE from 'three'; // core Three.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF/GLB loader
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // surface sampler
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // merge geometries

// Props: tunable parameters with defaults & min/max ranges
interface ParticleAnimationProps {
  size?: string;                   // Tailwind container size (min:'h-0 w-0', max:'h-full w-full')
  className?: string;              // Extra CSS classes
  modelUrl?: string;               // URL path to .gltf/.glb model
  particleCount?: number;          // Samples on surface (min:1000, max:50000)

  // Animation
  swingSpeed?: number;             // Y-axis swing speed (multiplier) (min:0, max:5)
  swingAngle?: number;             // Y-axis swing angle in radians (min:0, max:π/2)
  breathSpeed?: number;            // X-axis “breath” motion speed (min:0, max:5)
  pulseStrength?: number;          // Scale pulse frequency (min:0, max:10)
  zoomSpeed?: number;              // Z-axis in/out speed (min:0, max:5)
  zoomAmp?: number;                // Z-axis amplitude (units) (min:0, max:200)

  // Visual
  particleSize?: number;           // Point diameter (min:0.01, max:1)

  // Shading
  lightDirection?: [number, number, number]; // Light direction vector (normalized)
  shadingAmbient?: number;         // Ambient term (min:0, max:1)
  shadingDiffuse?: number;         // Diffuse term (min:0, max:1)

  // Depth jitter
  normalSpeed?: number;            // Normal wobble speed (min:0, max:10)
  normalAmplitude?: number;        // Wobble depth (units) (min:0, max:1)

  // Debug lights
  ambientLightColor?: string;      // Helper ambient light color
  ambientLightIntensity?: number;  // Helper ambient intensity (min:0, max:2)
  pointLightColor?: string;        // Helper point light color
  pointLightIntensity?: number;    // Helper point intensity (min:0, max:2)
  pointLightPosition?: [number, number, number]; // Helper point position (XYZ)
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',                 // default container size
  className = '',                     // no extra CSS
  modelUrl = '/girlhead/scene.gltf',      // default model path
  particleCount = 20000,               // 3.5k samples (1000–50000)

  swingSpeed = 0.3,                   // swing speed (0–5)
  swingAngle = Math.PI / 6,           // swing angle ~30° (0–π/2)
  breathSpeed = 0.8,                  // breath speed (0–5)
  pulseStrength = 1,                  // pulse freq (0–10)
  zoomSpeed = 1,                    // zoom speed (0–5)
  zoomAmp = 20,                      // zoom amplitude (0–200)
  particleSize = 0.01,                // point size (0.01–1)

  lightDirection = [0, 50, 50],       // light vector, normalized inside
  shadingAmbient = 1,                 // ambient term (0–1)
  shadingDiffuse = 0.7,               // diffuse term (0–1)

  normalSpeed = 0,                    // wobble speed (0–10)
  normalAmplitude = 0,                // wobble depth (0–1)

  ambientLightColor = '#ffffff',      // helper ambient light color
  ambientLightIntensity = 0.6,        // helper ambient intensity (0–2)
  pointLightColor = '#ffffff',        // helper point light color
  pointLightIntensity = 0.8,          // helper point intensity (0–2)
  pointLightPosition = [-10, 50, 60], // helper point position
}) => {
  const containerRef = useRef<HTMLDivElement>(null); // wrapper ref
  const pointsRef = useRef<THREE.Points>();          // points mesh ref

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // buffers
    let basePositions: Float32Array;
    let baseNormals: Float32Array;
    let normalPhases: Float32Array;

    // 1) scene + camera + renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      120,                              // FOV (deg) (10–120)
      container.clientWidth / container.clientHeight,
      0.1,                              // near plane (0.01+)
      1000                              // far plane
    );
    camera.position.set(0, 0, 50);     // camera placement

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cw = container.clientWidth, ch = container.clientHeight;
    renderer.setSize(cw * 1.5, ch * 1.5); // 150% to allow overflow
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '-25%';
    renderer.domElement.style.left = '-25%';
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2) debug lights
    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity));
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    // 2.1) shading constants
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient, diffuseI = shadingDiffuse;

    // define palette & weights
    const colorCandidates = [
      { color: new THREE.Color('#25572b'), weight: 0.6 }, // black 60%
      { color: new THREE.Color('#255744'), weight: 0.3 }, // green 30%
      { color: new THREE.Color('#255157'), weight: 0.1 }  // gold 10%
    ];
    const cum = colorCandidates.reduce<number[]>((acc, { weight }) => {
      acc.push((acc.at(-1) ?? 0) + weight); return acc;
    }, []);
    function pickColor(): THREE.Color {
      const r = Math.random();
      for (let i = 0; i < cum.length; i++)
        if (r <= cum[i]) return colorCandidates[i].color.clone();
      return colorCandidates[0].color.clone();
    }

    // 3) load & sample
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI; // flip
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse(o => {
          if ((o as THREE.Mesh).isMesh)
            geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        basePositions = new Float32Array(particleCount * 3);
        baseNormals   = new Float32Array(particleCount * 3);
        normalPhases  = new Float32Array(particleCount);
        const colorArr = new Float32Array(particleCount * 3);
        const tmpPos = new THREE.Vector3(), tmpNorm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tmpPos, tmpNorm);
          // store position
          basePositions.set([tmpPos.x, -tmpPos.y, tmpPos.z], i*3);
          // store normal
          tmpNorm.normalize();
          baseNormals.set([tmpNorm.x, tmpNorm.y, tmpNorm.z], i*3);
          // random phase
          normalPhases[i] = Math.random() * Math.PI * 2;
          // color pick & Lambert shading
          const col = pickColor();
          const d = Math.max(tmpNorm.dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          col.multiplyScalar(shade).offsetHSL(0, 0, (Math.random()-0.5)*0.03);
          colorArr.set([col.r, col.g, col.b], i*3);
        }

        // build points
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(colorArr, 3));
        const mat = new THREE.PointsMaterial({
          size: particleSize,           // (0.01–1)
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true
        });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        pointsRef.current = pts;
      },
      undefined,
      err => console.error('GLTF load error:', err)
    );

    // 4) animate
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pts = pointsRef.current;
      if (pts) {
        const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const idx = i*3;
          const offs = Math.sin(t * normalSpeed + normalPhases[i]) * normalAmplitude;
          arr[idx  ] = basePositions[idx  ] + baseNormals[idx  ] * offs;
          arr[idx+1] = basePositions[idx+1] + baseNormals[idx+1] * offs;
          arr[idx+2] = basePositions[idx+2] + baseNormals[idx+2] * offs;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        // other motions
        pts.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        pts.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const sp = 1 + 0.015 * Math.sin(pulseStrength * t);
        pts.scale.set(sp, sp, sp);
        pts.position.z = zoomAmp * Math.sin(t * zoomSpeed);
      }
      renderer.render(scene, camera);
    };
    animate();

    // 5) resize
    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w*1.5, h*1.5);
      renderer.domElement.style.top='-25%';
      renderer.domElement.style.left='-25%';
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId!);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && container) container.removeChild(renderer.domElement);
    };
  }, [
    modelUrl, particleCount,
    swingSpeed, swingAngle,
    breathSpeed, pulseStrength,
    zoomSpeed, zoomAmp,
    particleSize,
    lightDirection, shadingAmbient, shadingDiffuse,
    normalSpeed, normalAmplitude,
    ambientLightColor, ambientLightIntensity,
    pointLightColor, pointLightIntensity,
    pointLightPosition
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-visible ${size} ${className}`} // wrapper with overflow
    />
  );
};

export default ParticleAnimation;
