import React, { useRef, useEffect } from 'react'; // React + hooks
import * as THREE from 'three'; // core Three.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF/GLB loader
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // merge geometries

// Props: tunable parameters with defaults & min/max ranges
interface ParticleAnimationProps {
  size?: string;                   // Tailwind container size (min:'h-0 w-0', max:'h-full w-full')
  className?: string;              // Extra CSS classes
  modelUrl?: string;               // URL path to .gltf/.glb model
  particleCount?: number;          // Number of particles to sample (min:1000, max:50000)

  // Animation
  swingSpeed?: number;             // Y-axis swing speed multiplier (0–5)
  swingAngle?: number;             // Y-axis swing angle in radians (0–π/2)
  breathSpeed?: number;            // X-axis “breath” motion speed (0–5)
  pulseStrength?: number;          // Scale pulse frequency (0–10)
  zoomSpeed?: number;              // Z-axis in/out speed (0–5)
  zoomAmp?: number;                // Z-axis amplitude (units) (0–200)

  // Visual
  particleSize?: number;           // Point diameter (0.01–1)

  // Shading
  lightDirection?: [number, number, number]; // Light direction vector
  shadingAmbient?: number;         // Ambient term (0–1)
  shadingDiffuse?: number;         // Diffuse term (0–1)

  // Debug lights
  ambientLightColor?: string;      // Ambient light color
  ambientLightIntensity?: number;  // Ambient light intensity (0–2)
  pointLightColor?: string;        // Point light color
  pointLightIntensity?: number;    // Point light intensity (0–2)
  pointLightPosition?: [number, number, number]; // Point light position (XYZ)
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 50000,

  swingSpeed = 0.3,
  swingAngle = Math.PI / 6,
  breathSpeed = 0.8,
  pulseStrength = 1,
  zoomSpeed = 0.5,
  zoomAmp = 10,

  particleSize = 0.01,

  lightDirection = [0, 50, 50],
  shadingAmbient = 1,
  shadingDiffuse = 0.7,

  ambientLightColor = '#ffffff',
  ambientLightIntensity = 0.6,
  pointLightColor = '#ffffff',
  pointLightIntensity = 0.8,
  pointLightPosition = [-10, 50, 60],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // position buffer
    let basePositions: Float32Array;

    // 1) scene + camera + renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      120,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, -10, 70);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cw = container.clientWidth,
      ch = container.clientHeight;
    renderer.setSize(cw * 1.5, ch * 1.5);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '-25%';
    renderer.domElement.style.left = '-25%';
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2) lights
    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity));
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    // shading constants
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient,
      diffuseI = shadingDiffuse;

    // color palette
    const colorCandidates = [
      { color: new THREE.Color('#ffffff'), weight: 0.6 },
      { color: new THREE.Color('#255744'), weight: 0.3 },
      { color: new THREE.Color('#255157'), weight: 0.1 },
    ];
    const cum = colorCandidates.reduce<number[]>((acc, { weight }) => {
      acc.push((acc.at(-1) ?? 0) + weight);
      return acc;
    }, []);
    function pickColor(): THREE.Color {
      const r = Math.random();
      for (let i = 0; i < cum.length; i++) {
        if (r <= cum[i]) return colorCandidates[i].color.clone();
      }
      return colorCandidates[0].color.clone();
    }

    // 3) load & sample via vertices
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI;
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        merged.computeVertexNormals();

        const posAttr = merged.attributes.position as THREE.BufferAttribute;
        const normAttr = merged.attributes.normal as THREE.BufferAttribute;
        const vertexCount = posAttr.count;

        basePositions = new Float32Array(particleCount * 3);
        const colorArr = new Float32Array(particleCount * 3);
        const tmpPos = new THREE.Vector3();
        const tmpNorm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          const vid = Math.floor(Math.random() * vertexCount);
          tmpPos.set(
            posAttr.getX(vid),
            posAttr.getY(vid),
            posAttr.getZ(vid)
          );
          basePositions.set([tmpPos.x, -tmpPos.y, tmpPos.z], i * 3);

          tmpNorm
            .set(normAttr.getX(vid), normAttr.getY(vid), normAttr.getZ(vid))
            .normalize();
          const col = pickColor();
          const d = Math.max(tmpNorm.dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          col.multiplyScalar(shade).offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
          colorArr.set([col.r, col.g, col.b], i * 3);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          'position',
          new THREE.BufferAttribute(basePositions.slice(), 3)
        );
        geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
        const mat = new THREE.PointsMaterial({
          size: particleSize,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,
        });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        pointsRef.current = pts;
      },
      undefined,
      (err) => console.error('GLTF load error:', err)
    );

    // 4) animate without jitter
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pts = pointsRef.current;
      if (pts) {
        pts.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        pts.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const sp = 1 + 0.015 * Math.sin(pulseStrength * t);
        pts.scale.set(sp, sp, sp);
        pts.position.z = zoomAmp * Math.sin(t * zoomSpeed);
      }
      renderer.render(scene, camera);
    };
    animate();

    // 5) handle resize
    const onResize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w * 1.5, h * 1.5);
      renderer.domElement.style.top = '-25%';
      renderer.domElement.style.left = '-25%';
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId!);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && container) container.removeChild(renderer.domElement);
    };
  }, [
    modelUrl,
    particleCount,
    swingSpeed,
    swingAngle,
    breathSpeed,
    pulseStrength,
    zoomSpeed,
    zoomAmp,
    particleSize,
    lightDirection,
    shadingAmbient,
    shadingDiffuse,
    ambientLightColor,
    ambientLight\Intensity,
    pointLightColor,
    pointLightIntensity,
    pointLightPosition,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-visible ${size} ${className}`}
    />
  );
};

export default ParticleAnimation;
