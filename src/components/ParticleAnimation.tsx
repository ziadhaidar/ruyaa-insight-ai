import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface ParticleAnimationProps {
  size?: string;
  className?: string;
  modelUrl?: string;
  particleCount?: number;
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-70 w-70',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 10000,
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

    // commentary: 2) Add scene lights (visual helpers, not used by PointsMaterial)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pl = new THREE.PointLight(0xffffff, 0.8);
    pl.position.set(5, 5, 5);
    scene.add(pl);

    // commentary: 2.1) Bake-in lighting constants for shading particles
    const lightDir = new THREE.Vector3(5, 5, 5).normalize();    // light direction vector
    const ambientIntensity = 0.3;   // base ambient light intensity
    const diffuseIntensity = 0.7;   // directional light strength

    // commentary: 3) Load GLTF model and prepare surface sampler
    const loader = new GLTFLoader();
    let originalPositions: Float32Array;

    loader.load(
      modelUrl,
      (gltf) => {
        // commentary: Correct model orientation by flipping upside-down
        gltf.scene.rotation.x = Math.PI;

        // commentary: Merge all mesh geometries into a single BufferGeometry
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);

        // commentary: Create surface sampler from merged mesh
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // commentary: Allocate arrays for positions and colors
        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tempPos = new THREE.Vector3();    // temporary position storage
        const tempNorm = new THREE.Vector3();   // temporary normal storage
        const baseColor = new THREE.Color(0xf2c19e);  // base skin tone color

        // commentary: Sample points, flip vertically, and apply baked Lambertian shading
        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tempPos, tempNorm);

          // commentary: Set particle position (flip Y)
          posArr[i * 3] = tempPos.x;
          posArr[i * 3 + 1] = -tempPos.y;
          posArr[i * 3 + 2] = tempPos.z;

          // commentary: Compute Lambertian shade = ambient + diffuse * max(N·L, 0)
          const ndotl = Math.max(tempNorm.normalize().dot(lightDir), 0);
          const shade = ambientIntensity + diffuseIntensity * ndotl;

          // commentary: Apply shade and slight random jitter to color
          const shadedColor = baseColor.clone()
            .multiplyScalar(shade)
            .offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);

          colArr.set([shadedColor.r, shadedColor.g, shadedColor.b], i * 3);
        }

        originalPositions = posArr.slice();    // store original positions for wave animation

        // commentary: Build BufferGeometry and PointsMaterial
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

        const material = new THREE.PointsMaterial({
          size: 0.06,           // particle size
          vertexColors: true,   // use baked colors
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

    // commentary: 4) Animation loop for rotation, breathing, Z-pulse, and surface wave
    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (pointsRef.current) {
        // commentary: Ping-pong rotation on Y axis
        const swing = Math.sin(t * 0.5) * (Math.PI / 8);
        pointsRef.current.rotation.y = swing;

        // commentary: Breathing rotation on X axis
        pointsRef.current.rotation.x = 0.05 * Math.sin(0.5 * t);

        // commentary: Overall breathing scale pulse
        const scalePulse = 1 + 0.015 * Math.sin(1.2 * t);
        pointsRef.current.scale.set(scalePulse, scalePulse, scalePulse);

        // commentary: Move toward/away from camera along Z axis
        const zAmp = 100;
        pointsRef.current.position.z = zAmp * Math.sin(t * 0.5);

        // commentary: Gentle wave effect along original Z positions
        const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 2] = originalPositions![i + 2] + 0.005 * Math.sin(originalPositions![i] * 3 + t);
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // commentary: 5) Handle window resize events
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
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
  }, [modelUrl, particleCount]);

  return <div ref={containerRef} className={`relative ${size} ${className}`} />;
};

export default ParticleAnimation;
