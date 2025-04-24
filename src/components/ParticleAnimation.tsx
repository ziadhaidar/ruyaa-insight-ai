import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// commentary: Props for visual and animation customization
interface ParticleAnimationProps {
  size?: string;
  className?: string;
  modelUrl?: string;
  particleCount?: number;

  // Animation control props
  swingSpeed?: number;
  swingAngle?: number;
  breathSpeed?: number;
  pulseStrength?: number;
  zoomSpeed?: number;
  zoomAmp?: number;

  // Visual control prop
  particleSize?: number;

  // Shading props
  baseColor?: string;
  lightDirection?: [number, number, number];
  shadingAmbient?: number;
  shadingDiffuse?: number;

  // Scene light props
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  pointLightColor?: string;
  pointLightIntensity?: number;
  pointLightPosition?: [number, number, number];
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 30000,

  // Default animation props
  swingSpeed = 0.5,
  swingAngle = Math.PI / 100,
  breathSpeed = 0.8,
  pulseStrength = 3,
  zoomSpeed = 0.5,
  zoomAmp = 20,
  particleSize = 0.03,

  // Default shading props
  baseColor = '#58801b',
  lightDirection = [0, -50, -500],
  shadingAmbient = 0.8,
  shadingDiffuse = 0.2,

  // Default scene light props
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

    // commentary: Dynamic amplitude variables with smooth transitions
    let dynSwingPrev = swingAngle;
    let dynSwingTarget = swingAngle;
    let dynSwing = swingAngle;
    let dynZoomPrev = zoomAmp;
    let dynZoomTarget = zoomAmp;
    let dynZoom = zoomAmp;
    let dynPulsePrev = pulseStrength;
    let dynPulseTarget = pulseStrength;
    let dynPulse = pulseStrength;
    let nextRandomT = 0;
    let transitionStart = 0;
    const lerpDur = 1; // seconds for smooth transition

    // 1) Initialize scene, camera, and renderer
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

    // 2) Debug lights
    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity));
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    // 2.1) Shading setup
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient;
    const diffuseI = shadingDiffuse;
    const baseColorObj = new THREE.Color(baseColor);

    // 3) Load & sample
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
        const tempPos = new THREE.Vector3();
        const tempNorm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tempPos, tempNorm);
          posArr[i*3]     = tempPos.x;
          posArr[i*3 + 1] = -tempPos.y;
          posArr[i*3 + 2] = tempPos.z;
          const ndotl = Math.max(tempNorm.normalize().dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * ndotl;
          const shaded = baseColorObj.clone()
            .multiplyScalar(shade)
            .offsetHSL(0, 0, (Math.random()-0.5)*0.03);
          colArr.set([shaded.r, shaded.g, shaded.b], i*3);
        }
        originalPositions = posArr.slice();

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
      err => console.error('GLTF load error:', err)
    );

    // 4) Animation loop with smooth transitions
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // schedule new random targets every 3–6s
      if (t > nextRandomT) {
        dynSwingPrev   = dynSwing;
        dynSwingTarget = Math.random() * swingAngle * 1.5;
        dynZoomPrev    = dynZoom;
        dynZoomTarget  = Math.random() * zoomAmp * 1.5;
        dynPulsePrev   = dynPulse;
        dynPulseTarget = Math.random() * pulseStrength * 1.5;
        transitionStart = t;
        nextRandomT = t + 3 + Math.random()*3;
      }
      // interpolation factor
      const u = Math.min((t - transitionStart)/lerpDur, 1);
      dynSwing = THREE.MathUtils.lerp(dynSwingPrev, dynSwingTarget, u);
      dynZoom  = THREE.MathUtils.lerp(dynZoomPrev, dynZoomTarget, u);
      dynPulse = THREE.MathUtils.lerp(dynPulsePrev, dynPulseTarget, u);

      if (pointsRef.current) {
        pointsRef.current.rotation.y = Math.sin(t * swingSpeed) * dynSwing;
        pointsRef.current.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const scalePulse = 1 + 0.015 * Math.sin(dynPulse * t);
        pointsRef.current.scale.set(scalePulse, scalePulse, scalePulse);
        pointsRef.current.position.z = dynZoom * Math.sin(t * zoomSpeed);
        const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < arr.length; i+=3) {
          arr[i+2] = originalPositions![i+2] + 0.005 * Math.sin(originalPositions![i]*3 + t);
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 5) Handle resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h);
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

  return <div ref={containerRef} className={`relative ${size} ${className}`} />;
};

export default ParticleAnimation;
