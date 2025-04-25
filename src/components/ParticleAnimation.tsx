import React, { useRef, useEffect } from 'react'; // import React (JSX) + hooks for lifecycle
import * as THREE from 'three'; // import core Three.js library
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // loader for GLTF/GLB files
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // sample points on mesh surfaces
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // utilities to merge BufferGeometries

// Props: configurable parameters with defaults and suggested ranges
interface ParticleAnimationProps {
  size?: string;                   // Tailwind classes for container size (min: 'h-0 w-0', max: 'h-full w-full')
  className?: string;              // Any additional CSS classes
  modelUrl?: string;               // URL path to .gltf/.glb model
  particleCount?: number;          // Number of mesh surface samples (min:1000, max:50000)

  // Animation controls
  swingSpeed?: number;             // Speed of Y-axis swing (rad/sec multiplier) (min:0, max:5)
  swingAngle?: number;             // Max Y-axis rotation angle in radians (min:0, max:π/2)
  breathSpeed?: number;            // Speed of X-axis breathing motion (min:0, max:5)
  pulseStrength?: number;          // Frequency of scale pulsing (min:0, max:10)
  zoomSpeed?: number;              // Speed of Z-axis in/out motion (min:0, max:5)
  zoomAmp?: number;                // Amplitude of Z-axis movement (units) (min:0, max:200)

  // Visual styling
  particleSize?: number;           // Diameter of each particle (min:0.01, max:1)

  // Shading
  baseColor?: string;              // Base particle color (CSS hex)
  lightDirection?: [number, number, number]; // Light dir vector, normalized internally
  shadingAmbient?: number;         // Ambient shading term (min:0, max:1)
  shadingDiffuse?: number;         // Diffuse shading term (min:0, max:1)

  // Normal jitter (depth wobble)
  normalSpeed?: number;            // Speed of normal jitter oscillation (min:0, max:10)
  normalAmplitude?: number;        // Depth amplitude for normal jitter (units) (min:0, max:1)

  // Debug helper lights
  ambientLightColor?: string;      // Color of ambient helper light
  ambientLightIntensity?: number;  // Intensity of ambient helper light (min:0, max:2)
  pointLightColor?: string;        // Color of point helper light
  pointLightIntensity?: number;    // Intensity of point helper light (min:0, max:2)
  pointLightPosition?: [number, number, number]; // XYZ position of point helper light
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',            // default: moderate container (min-small, max-full)
  className = '',                // default: no extra CSS
  modelUrl = '/mask/scene.gltf', // default model path in public folder
  particleCount = 3500,          // default samples (~3k) (1000–50000)

  swingSpeed = 0.3,              // default swing speed (0–5)
  swingAngle = Math.PI / 6,      // default swing angle (~30°, 0–π/2)
  breathSpeed = 0.8,             // default breath speed (0–5)
  pulseStrength = 1,             // default pulse freq (0–10)
  zoomSpeed = 0.2,               // default zoom speed (0–5)
  zoomAmp = 0.6,                 // default zoom amplitude (0–200)
  particleSize = 0.01,           // default point size (0.01–1)

  baseColor = '#444444',         // default particle color (hex)
  lightDirection = [0, 50, 50],  // default light dom vector (normalized)
  shadingAmbient = 1,            // default ambient shading (0–1)
  shadingDiffuse = 0.7,          // default diffuse shading (0–1)

  normalSpeed = 0,               // default normal jitter speed (0–10)
  normalAmplitude = 0,         // default jitter depth (0–1)

  ambientLightColor = '#ffffff', // helper ambient light color
  ambientLightIntensity = 0.6,   // helper ambient intensity (0–2)
  pointLightColor = '#ffffff',   // helper point light color
  pointLightIntensity = 0.8,     // helper point intensity (0–2)
  pointLightPosition = [-10, 50, 60], // helper point light position
}) => {
  const containerRef = useRef<HTMLDivElement>(null); // container div ref
  const pointsRef = useRef<THREE.Points>();          // Points mesh ref

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Buffers for base positions, normals, and phase offsets
    let basePositions: Float32Array;
    let baseNormals: Float32Array;
    let normalPhases: Float32Array;

    // 1) Scene, camera, renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      120,                          // FOV (deg) (min:10, max:120)
      container.clientWidth / container.clientHeight, // aspect
      0.1,                          // near plane (min:0.01)
      1000                          // far plane
    );
    camera.position.set(0, 0, 1.3);   // camera placement

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    renderer.setSize(cw * 1.5, ch * 1.5); // 150% for overflow
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '-25%';
    renderer.domElement.style.left = '-25%';
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2) Debug lights
    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity));
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    // 2.1) Shading constants
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient;
    const diffuseI = shadingDiffuse;
    const baseColorObj = new THREE.Color(baseColor);

    // 3) Load model & sample points
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI; // flip model
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry); });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // allocate arrays
        basePositions = new Float32Array(particleCount * 3);
        baseNormals   = new Float32Array(particleCount * 3);
        normalPhases  = new Float32Array(particleCount);
        const colorArr = new Float32Array(particleCount * 3);
        const tmpPos = new THREE.Vector3();
        const tmpNorm = new THREE.Vector3();

        // sample & store base data
        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tmpPos, tmpNorm);
          basePositions.set([tmpPos.x, tmpPos.y, tmpPos.z], i*3);
          tmpNorm.normalize();
          baseNormals.set([tmpNorm.x, tmpNorm.y, tmpNorm.z], i*3);
          normalPhases[i] = Math.random() * Math.PI * 2; // random phase
          const d = Math.max(tmpNorm.dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          const c = baseColorObj.clone().multiplyScalar(shade).offsetHSL(0,0,(Math.random()-0.5)*0.03);
          colorArr.set([c.r, c.g, c.b], i*3);
        }

        // build PointsGeometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3));
        geometry.setAttribute('color',    new THREE.BufferAttribute(colorArr, 3));
        const material = new THREE.PointsMaterial({ size: particleSize, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true });
        const points = new THREE.Points(geometry, material);
        scene.add(points);
        pointsRef.current = points;
      },
      undefined,
      err => console.error('GLTF load error:', err)
    );

    // 4) Animation loop
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
          const phase  = normalPhases[i];
          const offset = Math.sin(t * normalSpeed + phase) * normalAmplitude; // jitter
          arr[idx]     = basePositions[idx]     + baseNormals[idx]     * offset;
          arr[idx+1]   = basePositions[idx+1]   + baseNormals[idx+1]   * offset;
          arr[idx+2]   = basePositions[idx+2]   + baseNormals[idx+2]   * offset;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        // apply other animations
        pts.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        pts.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const scalePulse = 1 + 0.015 * Math.sin(pulseStrength * t);
        pts.scale.set(scalePulse, scalePulse, scalePulse);
        pts.position.z = zoomAmp * Math.sin(t * zoomSpeed);
      }
      renderer.render(scene, camera);
    };
    animate();

    // 5) Responsive resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
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
    modelUrl, particleCount,
    swingSpeed, swingAngle,
    breathSpeed, pulseStrength,
    zoomSpeed, zoomAmp,
    particleSize,
    baseColor, lightDirection,
    shadingAmbient, shadingDiffuse,
    normalSpeed, normalAmplitude,
    ambientLightColor, ambientLightIntensity,
    pointLightColor, pointLightIntensity,
    pointLightPosition
  ]);

  return (
    <div ref={containerRef} className={`relative overflow-visible ${size} ${className}`} /> // wrapper with visible overflow
  );
};

export default ParticleAnimation; // export the component
