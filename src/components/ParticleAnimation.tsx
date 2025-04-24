import React, { useRef, useEffect } from 'react'; // import React and hooks
import * as THREE from 'three'; // core three.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // GLTF loader
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // mesh sampler
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // geometry utils

// Props for visual/animation customization (with descriptions and ranges)
interface ParticleAnimationProps {
  size?: string;                   // Tailwind classes for container size (min: 'h-0 w-0', max: 'h-full w-full')
  className?: string;              // Additional CSS classes
  modelUrl?: string;               // URL path to .gltf or .glb model
  particleCount?: number;          // Number of surface samples (min: 1000, max: 50000)

  // Animation props
  swingSpeed?: number;             // Speed of Y-axis oscillation (min: 0, max: 5)
  swingAngle?: number;             // Max rotation angle around Y in radians (min: 0, max: Math.PI/2)
  breathSpeed?: number;            // Speed of breathing rotation on X (min: 0, max: 5)
  pulseStrength?: number;          // Frequency of scale pulse (min: 0, max: 10)
  zoomSpeed?: number;              // Speed of Z-axis in/out movement (min: 0, max: 5)
  zoomAmp?: number;                // Amplitude of Z-axis movement (min: 0, max: 200)

  // Visual props
  particleSize?: number;           // Diameter of each point (min: 0.01, max: 1)

  // Shading props
  baseColor?: string;              // CSS hex for base particle color
  lightDirection?: [number, number, number]; // Light direction vector (normalized internally)
  shadingAmbient?: number;         // Ambient term for shading (min: 0, max: 1)
  shadingDiffuse?: number;         // Diffuse term for shading (min: 0, max: 1)

  // Debug scene lights
  ambientLightColor?: string;      // CSS color for ambient helper light
  ambientLightIntensity?: number;  // Intensity of ambient light (min: 0, max: 2)
  pointLightColor?: string;        // CSS color for point helper light
  pointLightIntensity?: number;    // Intensity of point light (min: 0, max: 2)
  pointLightPosition?: [number, number, number]; // Position of point helper light
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  // Container sizing
  size = 'h-80 w-80',            // default: moderate box (min: 'h-0 w-0', max: 'h-full w-full')
  className = '',
  // Model configuration
  modelUrl = '/mask/scene.gltf', // default path under public folder
  particleCount = 2000,          // default sample count (min:1000, max:50000)

  // Default animation props
  swingSpeed = 3,              // speed of the swing (min:0, max:5)
  swingAngle = Math.PI / 100,    // max angle in radians (~1.8°, min:0, max:π/2)
  breathSpeed = 0.8,             // speed of breathing rotation (min:0, max:5)
  pulseStrength = 1,             // frequency of scale pulse (min:0, max:10)
  zoomSpeed = 0.5,               // speed of zoom in/out (min:0, max:5)
  zoomAmp = 30,                  // amplitude of zoom (min:0, max:200)
  particleSize = 0.03,           // size of points (min:0.01, max:1)

  // Default shading props
  baseColor = '#000000',         // base color of particles (any hex)
  lightDirection = [0, 50, 50],  // light vector (normalized internally)
  shadingAmbient = 0.8,          // ambient lighting term (min:0, max:1)
  shadingDiffuse = 0.7,          // diffuse lighting term (min:0, max:1)

  // Debug lights
  ambientLightColor = '#ffffff', // ambient fill light color
  ambientLightIntensity = 0.6,   // ambient light intensity (min:0, max:2)
  pointLightColor = '#ffffff',   // point light color
  pointLightIntensity = 0.8,     // point light intensity (min:0, max:2)
  pointLightPosition = [-10, 50, 60], // point light position in scene
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1) Setup scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      30, // field of view in degrees (min:10, max:120)
      container.clientWidth / container.clientHeight,
      0.1, // near plane (min:0.01)
      1000 // far plane
    );
    camera.position.set(0, 0, 30); // camera placement

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    renderer.setSize(cw * 1.5, ch * 1.5); // enlarge canvas for overflow
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
    let originalPositions: Float32Array;
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI; // flip model
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse(o => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tmp = new THREE.Vector3();
        const nrm = new THREE.Vector3();

        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tmp, nrm);
          posArr[i*3] = tmp.x;
          posArr[i*3+1] = tmp.y;
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
      },
      undefined,
      err => console.error('GLTF load error:', err)
    );

    // animations loop
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

    // responsive resizing
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
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

  return (
    <div ref={containerRef} className={`relative overflow-visible ${size} ${className}`} />
  );
};

export default ParticleAnimation;
