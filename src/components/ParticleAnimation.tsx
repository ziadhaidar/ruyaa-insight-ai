import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// commentary: Allow parent components to customize animation and appearance
interface ParticleAnimationProps {
  size?: string;             // Tailwind classes for container size
  className?: string;        // Additional CSS classes
  modelUrl?: string;         // Path to glTF model
  particleCount?: number;    // Number of points sampled

  // commentary: Animation control props
  swingSpeed?: number;       // speed of Y-axis oscillation
  swingAngle?: number;       // max rotation angle around Y
  breathSpeed?: number;      // speed of breathing rotation on X
  pulseStrength?: number;    // frequency of breathing scale pulse
  zoomSpeed?: number;        // speed of Z-axis movement
  zoomAmp?: number;          // amplitude of Z-axis movement

  // commentary: Visual control prop
  particleSize?: number;     // size of each particle
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-70 w-70',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 10000,

  // commentary: Default values for new props
  swingSpeed = 0.5,
  swingAngle = Math.PI / 8,
  breathSpeed = 0.5,
  pulseStrength = 1.2,
  zoomSpeed = 0.5,
  zoomAmp = 100,

  particleSize = 0.06,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // commentary: 1) Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 50, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // commentary: 2) Optional scene lights for debugging
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pl = new THREE.PointLight(0xffffff, 0.8);
    pl.position.set(5, 5, 5);
    scene.add(pl);

    // commentary: 2.1) Bake-in lighting constants for shading
    const lightDir = new THREE.Vector3(5, 5, 5).normalize();
    const ambientIntensity = 0.3;
    const diffuseIntensity = 0.7;

    // commentary: 3) Load model and prepare sampler
    const loader = new GLTFLoader();
    let originalPositions: Float32Array;

    loader.load(
      modelUrl,
      (gltf) => {
        // commentary: Correct orientation
        gltf.scene.rotation.x = Math.PI;

        // commentary: Merge geometries
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);

        // commentary: Surface sampler
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // commentary: Allocate buffers
        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tempPos = new THREE.Vector3();
        const tempNorm = new THREE.Vector3();
        const baseColor = new THREE.Color(0xf2c19e);

        // commentary: Sample points with baked shading
        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tempPos, tempNorm);
          posArr[i * 3] = tempPos.x;
          posArr[i * 3 + 1] = -tempPos.y;
          posArr[i * 3 + 2] = tempPos.z;

          const ndotl = Math.max(tempNorm.normalize().dot(lightDir), 0);
          const shade = ambientIntensity + diffuseIntensity * ndotl;
          const shadedColor = baseColor.clone()
            .multiplyScalar(shade)
            .offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
          colArr.set([shadedColor.r, shadedColor.g, shadedColor.b], i * 3);
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
        // commentary: Y-axis ping-pong rotation
        pointsRef.current.rotation.y = Math.sin(t * swingSpeed) * swingAngle;

        // commentary: X-axis breathing rotation
        pointsRef.current.rotation.x = 0.05 * Math.sin(breathSpeed * t);

        // commentary: Overall breathing scale pulse
        const scalePulse = 1 + 0.015 * Math.sin(pulseStrength * t);
        pointsRef.current.scale.set(scalePulse, scalePulse, scalePulse);

        // commentary: Z-axis zoom pulse
        pointsRef.current.position.z = zoomAmp * Math.sin(t * zoomSpeed);

        // commentary: Gentle surface wave
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
  }, [modelUrl, particleCount, swingSpeed, swingAngle, breathSpeed, pulseStrength, zoomSpeed, zoomAmp, particleSize]);

  return <div ref={containerRef} className={`relative ${size} ${className}`} />;
};

export default ParticleAnimation;
