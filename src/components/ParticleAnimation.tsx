import React, { useRef, useEffect } from 'react'; // React + hooks
import * as THREE from 'three'; // core Three.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF/GLB loader
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // sampler for uniform surface sampling
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // merge geometries

// Props: tunable parameters with defaults & min/max ranges
interface ParticleAnimationProps {
  size?: string;                   // Tailwind container size (min: 'h-0 w-0', max: 'h-full w-full')
  className?: string;              // Extra CSS classes
  modelUrl?: string;               // URL to .gltf/.glb model
  particleCount?: number;          // Number of particles (min: 1000, max: 50000)

  // Animation
  swingSpeed?: number;             // Y-axis swing speed (min: 0, max: 5)
  swingAngle?: number;             // Y-axis swing angle in radians (min: 0, max: Math.PI/2)
  breathSpeed?: number;            // X-axis “breath” rotation speed (min: 0, max: 5)
  pulseStrength?: number;          // Scale pulse frequency (min: 0, max: 10)
  zoomSpeed?: number;              // Z-axis in/out speed (min: 0, max: 5)
  zoomAmp?: number;                // Z-axis amplitude distance (min: 0, max: 200)

  // Visual
  particleSize?: number;           // Particle point size (min: 0.01, max: 1)

  // Shading
  lightDirection?: [number, number, number]; // Light direction vector
  shadingAmbient?: number;         // Ambient shading (min: 0, max: 1)
  shadingDiffuse?: number;         // Diffuse shading (min: 0, max: 1)

  // Debug lights
  ambientLightColor?: string;      // Ambient light color
  ambientLightIntensity?: number;  // Ambient intensity (min: 0, max: 2)
  pointLightColor?: string;        // Point light color
  pointLightIntensity?: number;    // Point intensity (min: 0, max: 2)
  pointLightPosition?: [number, number, number]; // Point light XYZ position
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',
  className = '',
  modelUrl = '/girlhead/scene.gltf',
  particleCount = 50000,

  swingSpeed = 0.3,
  swingAngle = Math.PI / 6,
  breathSpeed = 0.8,
  pulseStrength = 1,
  zoomSpeed = 0.5,
  zoomAmp = 10,

  particleSize = 0.01,

  lightDirection = [0, 50, 50],
  shadingAmbient = 1,
  shadingDiffuse = 0.7,

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

    // 1) Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      120,                                  // FOV (deg)
      container.clientWidth / container.clientHeight,
      0.1,                                  // near plane
      1000                                  // far plane
    );
    camera.position.set(0, -10, 70);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cw = container.clientWidth, ch = container.clientHeight;
    renderer.setSize(cw * 1.5, ch * 1.5);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '-25%';
    renderer.domElement.style.left = '-25%';
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2) Lights
    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity));
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);
    pl.position.set(...pointLightPosition);
    scene.add(pl);

    // shading constants
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize();
    const ambientI = shadingAmbient, diffuseI = shadingDiffuse;

    // color palette
    const colorCandidates = [
      { color: new THREE.Color('#25572b'), weight: 0.6 },
      { color: new THREE.Color('#255744'), weight: 0.3 },
      { color: new THREE.Color('#255157'), weight: 0.1 },
    ];
    const cum = colorCandidates.reduce<number[]>((acc, { weight }) => {
      acc.push((acc.at(-1) ?? 0) + weight);
      return acc;
    }, []);
    const pickColor = () => {
      const r = Math.random();
      for (let i = 0; i < cum.length; i++) if (r <= cum[i]) return colorCandidates[i].color.clone();
      return colorCandidates[0].color.clone();
    };

    // 3) Load model & sample only front-facing surface
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI; // flip if needed
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        merged.computeVertexNormals();

        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();
        basePositions = new Float32Array(particleCount * 3);
        const colorArr = new Float32Array(particleCount * 3);
        const tmpPos = new THREE.Vector3(), tmpNorm = new THREE.Vector3(), viewDir = new THREE.Vector3();

        let placed = 0;
        while (placed < particleCount) {
          sampler.sample(tmpPos, tmpNorm);                     // uniform sample
          // compute view direction vector
          viewDir.copy(camera.position).sub(tmpPos).normalize();
          if (tmpNorm.dot(viewDir) <= 0) continue;             // skip back-facing samples

          // set position (invert Y if model is flipped)
          basePositions.set([tmpPos.x, -tmpPos.y, tmpPos.z], placed * 3);
          // shading & color
          const d = Math.max(tmpNorm.dot(lightDirVec), 0);
          const shade = ambientI + diffuseI * d;
          const col = pickColor().multiplyScalar(shade).offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
          colorArr.set([col.r, col.g, col.b], placed * 3);
          placed++;
        }

        // build Points mesh
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(basePositions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
        const mat = new THREE.PointsMaterial({
          size: particleSize,          // (0.01–1)
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,
        });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        pointsRef.current = pts;
      },
      undefined,
      (err) => console.error('GLTF load error:', err)
    );

    // 4) Animate: swing, breath, pulse, zoom
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pts = pointsRef.current;
      if (pts) {
        pts.rotation.y = Math.sin(t * swingSpeed) * swingAngle;      // swing (0–5, 0–PI/2)
        pts.rotation.x = 0.05 * Math.sin(breathSpeed * t);          // breath (0–5)
        const sp = 1 + 0.015 * Math.sin(pulseStrength * t);         // pulse (0–10)
        pts.scale.set(sp, sp, sp);
        pts.position.z = zoomAmp * Math.sin(t * zoomSpeed);         // zoom
