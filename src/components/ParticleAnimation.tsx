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
  particleCount = 20000,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1) Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 50, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2) Lights for depth
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pl = new THREE.PointLight(0xffffff, 0.8);
    pl.position.set(5, 5, 5);
    scene.add(pl);

    // 3) Load GLTF and sample points
    const loader = new GLTFLoader();
    let originalPositions: Float32Array;

    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI;
        // merge all geometries
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);

        // sampler
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // buffers
        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const temp = new THREE.Vector3();
        const baseColor = new THREE.Color(0xf2c19e);

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(temp);
            posArr[i * 3 + 0] =  temp.x;
            posArr[i * 3 + 1] = -temp.y;  // inverted Y
            posArr[i * 3 + 2] =  temp.z;

          // skin-tone variation
          const v = (Math.random() - 0.5) * 0.05;
          const c = baseColor.clone().offsetHSL(0, 0, v);
          colArr.set([c.r, c.g, c.b], i * 3);
        }

        originalPositions = posArr.slice();

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

        const material = new THREE.PointsMaterial({
          size: 0.03,
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

    // 4) Animation
    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (pointsRef.current) {
        // rotate & pulse
       // pointsRef.current.rotation.y = 0.2 * t;
          const swing = Math.sin(t * 0.5) * (Math.PI / 8);  // 0.5 = speed and PI/8 is angle of rotation
        pointsRef.current.rotation.y = swing;
        pointsRef.current.rotation.x = 0.05 * Math.sin(0.5 * t);
        const s = 1 + 0.015 * Math.sin(1.2 * t);
        pointsRef.current.scale.set(s, s, s);
        // ─── move toward/away from camera ───
        // amplitude = 100 units, speed = 0.5 * t
        const zAmp = 100;
        pointsRef.current.position.z = zAmp * Math.sin(t * 0.5);
        // gentle wave
        const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 2] = originalPositions![i + 2] + 0.005 * Math.sin(originalPositions![i] * 3 + t);
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 5) Resize
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
