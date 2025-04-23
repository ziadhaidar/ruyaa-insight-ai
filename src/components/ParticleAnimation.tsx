import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// commentary: Extend props to include shading and lighting customization
interface ParticleAnimationProps {
  size?: string;                   // Tailwind classes for container size
  className?: string;              // Additional CSS classes
  modelUrl?: string;               // Path to glTF model
  particleCount?: number;          // Number of points to sample

  // commentary: Animation control props
  swingSpeed?: number;             // speed of Y-axis oscillation
  swingAngle?: number;             // max rotation angle around Y
  breathSpeed?: number;            // speed of breathing rotation on X
  pulseStrength?: number;          // frequency of breathing scale pulse
  zoomSpeed?: number;              // speed of Z-axis movement
  zoomAmp?: number;                // amplitude of Z-axis movement

  // commentary: Visual control prop
  particleSize?: number;           // size of each particle

  // commentary: Shading props
  baseColor?: string;              // hex for skin tone base color
  lightDirection?: [number, number, number]; // direction for baked shading
  shadingAmbient?: number;         // ambient light for shading
  shadingDiffuse?: number;         // diffuse light for shading

  // commentary: Scene light props (for optional debugging)
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  pointLightColor?: string;
  pointLightIntensity?: number;
  pointLightPosition?: [number, number, number];
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-70 w-70',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 15000,                   // Number of points to sample

  // commentary: Default animation props
  swingSpeed = 0.5,
  swingAngle = Math.PI / 10,
  breathSpeed = 0.5,
  pulseStrength = 1.2,
  zoomSpeed = 0.5,
  zoomAmp = 30,
  particleSize = 0.03,                  // Particules size

  // commentary: Default shading props
  baseColor = '#f2c19e',
  lightDirection = [5, 5, 5],
  shadingAmbient = 0.3,
  shadingDiffuse = 0.7,

  // commentary: Default scene light props
  ambientLightColor = '#ffffff',
  ambientLightIntensity = 0.8,
  pointLightColor = '#ffffff',
  pointLightIntensity = 0.8,
  pointLightPosition = [5, 5, 500],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // commentary: 1) Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,   //initial value was 30
      container.clientWidth / container.clientHeight,
      0.6,  // initial value was 0.1
      1000
    );
    camera.position.set(0, 50, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // commentary: 2) Optional scene lights for debugging
    const ambLight = new THREE.AmbientLight(ambientLightColor, ambientLightIntensity);
    scene.add(ambLight);
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    // commentary: 2.1) Prepare shading constants
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient;
    const diffuseI = shadingDiffuse;
    const baseColorObj = new THREE.Color(baseColor);

    // commentary: 3) Load model and sample points
    const loader = new GLTFLoader();
    let originalPositions: Float32Array;

    loader.load(
      modelUrl,
      (gltf) => {
        // commentary: Flip model orientation
        gltf.scene.rotation.x = Math.PI;

        // commentary: Merge all geometries
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);

        // commentary: Create a sampler for the mesh
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // commentary: Allocate buffers for positions and colors
        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tempPos = new THREE.Vector3();
        const tempNorm = new THREE.Vector3();

        // commentary: Sample and shade each point
        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tempPos, tempNorm);
          posArr[i * 3] = tempPos.x;
          posArr[i * 3 + 1] = -tempPos.y;
          posArr[i * 3 + 2] = tempPos.z;

          const ndotl = Math.max(tempNorm.normalize().dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * ndotl;
          const shaded = baseColorObj.clone()
            .multiplyScalar(shade)
            .offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
          colArr.set([shaded.r, shaded.g, shaded.b], i * 3);
        }
        originalPositions = posArr.slice();

        // commentary: Build geometry & material
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

        const material = new THREE.PointsMaterial({
          size: particleSize,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);
        pointsRef.current = points;
      },
      undefined,
      (err) => console.error('GLTF load error:', err)
    );

    // commentary: 4) Animation loop
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (pointsRef.current) {
        // Y-axis ping-pong rotation
        pointsRef.current.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        // X-axis breathing rotation
        pointsRef.current.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        // overall breathing scale pulse
        const scalePulse = 1 + 0.015 * Math.sin(pulseStrength * t);
        pointsRef.current.scale.set(scalePulse, scalePulse, scalePulse);
        // Z-axis zoom pulse
        pointsRef.current.position.z = zoomAmp * Math.sin(t * zoomSpeed);
        // surface wave effect
        const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 2] = originalPositions![i + 2] + 0.005 * Math.sin(originalPositions![i] * 3 + t);
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    animate();

    // commentary: 5) Handle resize
    const onResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
    baseColor,
    lightDirection,
    shadingAmbient,
    shadingDiffuse,
    ambientLightColor,
    ambientLightIntensity,
    pointLightColor,
    pointLightIntensity,
    pointLightPosition,
  ]);

  return <div ref={containerRef} className={`relative ${size} ${className}`} />;
};

export default ParticleAnimation;
