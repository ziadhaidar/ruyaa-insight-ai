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
  swingSpeed?: number;
  swingAngle?: number;
  breathSpeed?: number;
  pulseStrength?: number;
  zoomSpeed?: number;
  zoomAmp?: number;
  particleSize?: number;
  baseColor?: string;
  lightDirection?: [number, number, number];
  shadingAmbient?: number;
  shadingDiffuse?: number;
  ambientLightColor?: string;
  ambientLightIntensity?: number;
  pointLightColor?: string;
  pointLightIntensity?: number;
  pointLightPosition?: [number, number, number];
  // commentary: New prop to control wireframe connections
  neighborCount?: number;  // number of nearest neighbors to connect lines to
  lineColor?: string;
  lineOpacity?: number;
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-70 w-70',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 8000,
  swingSpeed = 0.5,
  swingAngle = Math.PI / 10,
  breathSpeed = 0.5,
  pulseStrength = 1.2,
  zoomSpeed = 0.5,
  zoomAmp = 30,
  particleSize = 0.6,
  baseColor = '#f2c19e',
  lightDirection = [5, 5, 5],
  shadingAmbient = 0.3,
  shadingDiffuse = 0.7,
  ambientLightColor = '#ffffff',
  ambientLightIntensity = 0.6,
  pointLightColor = '#ffffff',
  pointLightIntensity = 0.8,
  pointLightPosition = [5, 5, 5],
  neighborCount = 0,           // connect each particle to # nearest neighbors
  lineColor = '#06402b',
  lineOpacity = 0.3,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>();
  const linesRef = useRef<THREE.LineSegments>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // commentary: Group to hold points and lines so transforms apply equally
    const group = new THREE.Group();

    // commentary: 1) Scene, camera, renderer
    const scene = new THREE.Scene();
    scene.add(group);
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
        gltf.scene.rotation.x = Math.PI; // flip model
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // buffers for points
        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tempPos = new THREE.Vector3();
        const tempNorm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tempPos, tempNorm);
          posArr[i * 3] = tempPos.x;
          posArr[i * 3 + 1] = -tempPos.y;
          posArr[i * 3 + 2] = tempPos.z;
          const ndotl = Math.max(tempNorm.normalize().dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * ndotl;
          const shaded = baseColorObj.clone().multiplyScalar(shade)
            .offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
          colArr.set([shaded.r, shaded.g, shaded.b], i * 3);
        }
        originalPositions = posArr.slice();

        // commentary: Create point cloud
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
        const mat = new THREE.PointsMaterial({ size: particleSize, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true });
        const points = new THREE.Points(geom, mat);
        group.add(points);
        pointsRef.current = points;

        // commentary: Build wireframe lines between nearest neighbors
        const positionsArray = Array.from(posArr);
        const linePositions: number[] = [];
        // naive nearest neighbor search (O(n^2)), caution for large counts
        for (let i = 0; i < particleCount; i++) {
          const xi = positionsArray[3 * i];
          const yi = positionsArray[3 * i + 1];
          const zi = positionsArray[3 * i + 2];
          // build list of distances
          const dists: { idx: number; dist: number }[] = [];
          for (let j = 0; j < particleCount; j++) {
            if (i === j) continue;
            const xj = positionsArray[3 * j];
            const yj = positionsArray[3 * j + 1];
            const zj = positionsArray[3 * j + 2];
            const dx = xi - xj, dy = yi - yj, dz = zi - zj;
            dists.push({ idx: j, dist: dx * dx + dy * dy + dz * dz });
          }
          dists.sort((a, b) => a.dist - b.dist);
          for (let k = 0; k < neighborCount; k++) {
            const j = dists[k].idx;
            // line from i to j
            linePositions.push(xi, yi, zi, positionsArray[3 * j], positionsArray[3 * j + 1], positionsArray[3 * j + 2]);
          }
        }
        const lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
        const lineMat = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: lineOpacity });
        const lines = new THREE.LineSegments(lineGeom, lineMat);
        group.add(lines);
        linesRef.current = lines;
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
      if (pointsRef.current && linesRef.current) {
        // apply same transforms to group
        group.rotation.y = Math.sin(t * swingSpeed) * swingAngle;
        group.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        const scalePulse = 1 + 0.015 * Math.sin(pulseStrength * t);
        group.scale.set(scalePulse, scalePulse, scalePulse);
        group.position.z = zoomAmp * Math.sin(t * zoomSpeed);
        // update surface wave for points
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
    neighborCount,
    lineColor,
    lineOpacity,
  ]);

  return <div ref={containerRef} className={`relative ${size} ${className}`} />;
};

export default ParticleAnimation;
