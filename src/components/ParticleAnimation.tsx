import React, { useRef, useEffect } from 'react'; // import React and hooks
import * as THREE from 'three'; // core three.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF loader
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // mesh sampler
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // geometry utils

// Props for visual/animation customization
interface ParticleAnimationProps {
  size?: string;                   // Tailwind classes for container size
  className?: string;              // Extra CSS classes
  modelUrl?: string;               // Path to .gltf model
  particleCount?: number;          // Number of surface samples

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

  // Debug scene lights
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  pointLightColor?: string;
  pointLightIntensity?: number;
  pointLightPosition?: [number, number, number];
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',            // container size
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 20000,

  // animations
  swingSpeed = 0.5,
  swingAngle = Math.PI / 100,
  breathSpeed = 0.8,
  pulseStrength = 1,
  zoomSpeed = 0.5,
  zoomAmp = 40,
  particleSize = 0.03,

  // shading
  baseColor = '#000000',
  lightDirection = [0, 50, 500],
  shadingAmbient = 0.8,
  shadingDiffuse = 0.7,

  // debug lights
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

    // 1) Setup dynamic vars, scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      30,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 50, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // enlarge canvas to 150% so animation can overflow
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    renderer.setSize(cw * 1.2, ch * 1.2);
    // position canvas to center overflow
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

    // 2.1) shading setup
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient;
    const diffuseI = shadingDiffuse;
    const baseColorObj = new THREE.Color(baseColor);

    // 3) Load + sample
    const loader = new GLTFLoader();
    let originalPositions: Float32Array;
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI;
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse(o => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tmp = new THREE.Vector3();
        const nrm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tmp, nrm);
          posArr[i*3] = tmp.x;
          posArr[i*3+1] = -tmp.y;
          posArr[i*3+2] = tmp.z;
          const d = Math.max(nrm.normalize().dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          const c = baseColorObj.clone().multiplyScalar(shade).offsetHSL(0,0,(Math.random()-0.5)*0.03);
          colArr.set([c.r, c.g, c.b], i*3);
        }
        originalPositions = posArr.slice();

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
        const mat = new THREE.PointsMaterial({ size: particleSize, vertexColors: true, transparent: true, opacity:0.9, sizeAttenuation: true });
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        pointsRef.current = points;
      }, undefined,
      err => console.error('GLTF load error:', err)
    );

    // animations
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (pointsRef.current) {
        pointsRef.current.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        pointsRef.current.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const sp = 1 + 0.015 * Math.sin(pulseStrength * t);
        pointsRef.current.scale.set(sp, sp, sp);
        pointsRef.current.position.z = zoomAmp * Math.sin(t * zoomSpeed);
        const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i=0;i<arr.length;i+=3) arr[i+2] = originalPositions![i+2] + 0.005*Math.sin(originalPositions![i]*3+t);
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    animate();

    // responsive
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      // update canvas too
      renderer.setSize(w*1.5, h*1.5);
      renderer.domElement.style.top='-25%'; renderer.domElement.style.left='-25%';
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
    ambientLightColor, ambientLightIntensity,
    pointLightColor, pointLightIntensity,
    pointLightPosition
  ]);

  // overflow-visible allows the enlarged canvas to spill out of the box
  return (
    <div ref={containerRef} className={`relative overflow-visible ${size} ${className}`} />
  );
};

export default ParticleAnimation;
