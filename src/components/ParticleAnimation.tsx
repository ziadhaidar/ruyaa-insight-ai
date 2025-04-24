import React, { useRef, useEffect } from 'react'; // import React and hooks
import * as THREE from 'three'; // core three.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF loader
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // mesh sampler
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // geometry utils

// Props for visual/animation customization
interface ParticleAnimationProps {
  size?: string;
  className?: string;
  modelUrl?: string;
  particleCount?: number;

  // Animation props
  swingSpeed?: number;
  swingAngle?: number;
  breathSpeed?: number;
  pulseStrength?: number;
  zoomSpeed?: number;
  zoomAmp?: number;

  // Visual props
  particleSize?: number;

  // Shading props
  baseColor?: string;
  lightDirection?: [number, number, number];
  shadingAmbient?: number;
  shadingDiffuse?: number;

  // Normal jitter props
  normalSpeed?: number;      // speed of jitter along normals
  normalAmplitude?: number;  // amplitude of jitter (units)

  // Debug scene lights
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  pointLightColor?: string;
  pointLightIntensity?: number;
  pointLightPosition?: [number, number, number];
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',
  className = '',
  modelUrl = '/mask/scene.gltf',
  particleCount = 3000,

  swingSpeed = 0.3,
  swingAngle = Math.PI / 6,
  breathSpeed = 0.8,
  pulseStrength = 1,
  zoomSpeed = 0.5,
  zoomAmp = 3,
  particleSize = 0.01,

  baseColor = '#444444',
  lightDirection = [0, 50, 50],
  shadingAmbient = 1,
  shadingDiffuse = 0.7,

  // jitter defaults
  normalSpeed = 1,         // default jitter speed
  normalAmplitude = 0.2,   // default jitter amplitude

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

    // arrays for base positions and normals
    let basePositions: Float32Array;
    let baseNormals: Float32Array;
    let normalPhases: Float32Array;

    // 1) Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(120, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 4);
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

    // 3) Load model and sample points
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI;
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry); });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // allocate buffers
        basePositions = new Float32Array(particleCount * 3);
        baseNormals   = new Float32Array(particleCount * 3);
        normalPhases  = new Float32Array(particleCount);
        const colorArr = new Float32Array(particleCount * 3);
        const tmpPos = new THREE.Vector3();
        const tmpNorm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tmpPos, tmpNorm);
          // store base position
          basePositions[i*3]   = tmpPos.x;
          basePositions[i*3+1] = tmpPos.y;
          basePositions[i*3+2] = tmpPos.z;
          // store base normal
          tmpNorm.normalize();
          baseNormals[i*3]   = tmpNorm.x;
          baseNormals[i*3+1] = tmpNorm.y;
          baseNormals[i*3+2] = tmpNorm.z;
          // random phase for jitter
          normalPhases[i] = Math.random() * Math.PI * 2;
          // initial shaded color
          const d = Math.max(tmpNorm.dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          const c = baseColorObj.clone().multiplyScalar(shade).offsetHSL(0, 0, (Math.random()-0.5)*0.03);
          colorArr.set([c.r, c.g, c.b], i*3);
        }

        // build geometry
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

    // 4) Animation loop with normal jitter
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
          // base + normal * jitter
          const phase = normalPhases[i];
          const offset = Math.sin(t * normalSpeed + phase) * normalAmplitude;
          arr[idx]     = basePositions[idx]     + baseNormals[idx]     * offset;
          arr[idx + 1] = basePositions[idx + 1] + baseNormals[idx + 1] * offset;
          arr[idx + 2] = basePositions[idx + 2] + baseNormals[idx + 2] * offset;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        // existing animations
        pts.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        pts.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const sp = 1 + 0.015 * Math.sin(pulseStrength * t);
        pts.scale.set(sp, sp, sp);
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
    <div ref={containerRef} className={`relative overflow-visible ${size} ${className}`} />
  );
};

export default ParticleAnimation;
