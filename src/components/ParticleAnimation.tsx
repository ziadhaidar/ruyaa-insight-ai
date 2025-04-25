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
  size = 'h-80 w-80',
  className = '',
  modelUrl = '/mask/scene.gltf',
  particleCount = 3500,

  swingSpeed = 0.3,
  swingAngle = Math.PI / 6,
  breathSpeed = 0.8,
  pulseStrength = 1,
  zoomSpeed = 0.2,
  zoomAmp = 0.6,
  particleSize = 0.01,

  lightDirection = [0, 50, 50],
  shadingAmbient = 1,
  shadingDiffuse = 0.7,

  normalSpeed = 0,
  normalAmplitude = 0,

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

    let basePositions: Float32Array;
    let baseNormals: Float32Array;
    let normalPhases: Float32Array;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      120,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 1.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    renderer.setSize(cw * 1.5, ch * 1.5);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '-25%';
    renderer.domElement.style.left = '-25%';
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity));
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient;
    const diffuseI = shadingDiffuse;

    // Define color palettes and percentages
    const colorCandidates = [
      { color: new THREE.Color('#000000'), weight: 0.6 }, // black 60%
      { color: new THREE.Color('#00ff00'), weight: 0.3 }, // green 30%
      { color: new THREE.Color('#FFD700'), weight: 0.1 }  // gold 10%
    ];

    // Build cumulative distribution
    const cumulative = colorCandidates.reduce<number[]>((acc, cur) => {
      const sum = (acc.length ? acc[acc.length - 1] : 0) + cur.weight;
      acc.push(sum);
      return acc;
    }, []);

    function pickColorBase(): THREE.Color {
      const r = Math.random();
      for (let i = 0; i < cumulative.length; i++) {
        if (r <= cumulative[i]) return colorCandidates[i].color;
      }
      return colorCandidates[0].color;
    }

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI;
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse(o => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        basePositions = new Float32Array(particleCount * 3);
        baseNormals   = new Float32Array(particleCount * 3);
        normalPhases  = new Float32Array(particleCount);
        const colorArr = new Float32Array(particleCount * 3);
        const tmpPos = new THREE.Vector3();
        const tmpNorm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tmpPos, tmpNorm);
          basePositions.set([tmpPos.x, tmpPos.y, tmpPos.z], i * 3);
          tmpNorm.normalize();
          baseNormals.set([tmpNorm.x, tmpNorm.y, tmpNorm.z], i * 3);
          normalPhases[i] = Math.random() * Math.PI * 2;

          // pick one of three base colors by weighted random
          const baseCol = pickColorBase().clone();
          const d = Math.max(tmpNorm.dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          baseCol.multiplyScalar(shade).offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
          colorArr.set([baseCol.r, baseCol.g, baseCol.b], i * 3);
        }

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

    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pts = pointsRef.current;
      if (pts) {
        const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          const offset = Math.sin(t * normalSpeed + normalPhases[i]) * normalAmplitude;
          arr[idx]     = basePositions[idx]     + baseNormals[idx]     * offset;
          arr[idx + 1] = basePositions[idx + 1] + baseNormals[idx + 1] * offset;
          arr[idx + 2] = basePositions[idx + 2] + baseNormals[idx + 2] * offset;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        pts.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        pts.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const scalePulse = 1 + 0.015 * Math.sin(pulseStrength * t);
        pts.scale.set(scalePulse, scalePulse, scalePulse);
        pts.position.z = zoomAmp * Math.sin(t * zoomSpeed);
      }
      renderer.render(scene, camera);
    };
    animate();

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
    lightDirection, shadingAmbient, shadingDiffuse,
    normalSpeed, normalAmplitude,
    ambientLightColor, ambientLightIntensity,
    pointLightColor, pointLightIntensity,
    pointLightPosition
  ]);

  return (
    <div ref={containerRef} className={`relative overflow-visible ${size} ${className}`} />
  );
};

export default ParticleAnimation;
