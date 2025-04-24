import React, { useRef, useEffect } from 'react'; // import React and hooks for lifecycle and ref handling
import * as THREE from 'three'; // import core Three.js library
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // loader for glTF models
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'; // sampler to pick points on mesh surface
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // utils to merge geometries

// Props define all tunable parameters with defaults and valid ranges
interface ParticleAnimationProps {
  size?: string;                   // Tailwind CSS classes for container size (e.g. 'h-80 w-80', min:'h-0 w-0', max:'h-full w-full')
  className?: string;              // Additional CSS classes to append
  modelUrl?: string;               // Path to glTF model (must exist in public folder)
  particleCount?: number;          // Number of points sampled (min:1000 for speed, max:50000+ for detail)

  // Animation control props
  swingSpeed?: number;             // Speed multiplier for Y-axis oscillation (min:0.1, max:2)
  swingAngle?: number;             // Base max rotation angle around Y in radians (min:0, max:PI/2)
  breathSpeed?: number;            // Speed of breathing rotation on X (min:0.1, max:2)
  pulseStrength?: number;          // Base frequency of scale pulse (min:0.5, max:10)
  zoomSpeed?: number;              // Speed of Z-axis in/out movement (min:0.1, max:2)
  zoomAmp?: number;                // Base amplitude of Z-axis movement in units (min:0, max:200)

  // Visual control prop
  particleSize?: number;           // Diameter of each point (min:0.01, max:1)

  // Shading props for baked Lambertian
  baseColor?: string;              // CSS hex for base particle color
  lightDirection?: [number, number, number]; // light direction vector (normalized internally)
  shadingAmbient?: number;         // Ambient term for shading (min:0, max:1)
  shadingDiffuse?: number;         // Diffuse term for shading (min:0, max:1)

  // Scene lighting props for debugging only
  ambientLightColor?: string;      // CSS color for ambient helper light
  ambientLightIntensity?: number;  // Intensity of ambient light (min:0, max:2)
  pointLightColor?: string;        // CSS color for point helper light
  pointLightIntensity?: number;    // Intensity of point light (min:0, max:2)
  pointLightPosition?: [number, number, number]; // Position of point helper light in world units
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({
  size = 'h-80 w-80',                   // default container size classes
  className = '',
  modelUrl = '/girlhead/scene.gltf',    // default model path
  particleCount = 30000,                // default number of sampled particles

  // Default animation props
  swingSpeed = 0.5,                    // default swing speed
  swingAngle = Math.PI / 100,         // default swing angle (~1.8°)
  breathSpeed = 0.8,                   // default breath rotation speed
  pulseStrength = 3,                   // default pulse frequency
  zoomSpeed = 0.5,                     // default zoom speed
  zoomAmp = 20,                        // default zoom amplitude
  particleSize = 0.03,                 // default particle size

  // Default shading props
  baseColor = '#58801b',               // dark green base color
  lightDirection = [0, -50, -500],     // vector pointing from camera to scene center
  shadingAmbient = 0.8,                // strong ambient base (80%)
  shadingDiffuse = 0.2,                // low diffuse contribution (20%)

  // Default scene light props
  ambientLightColor = '#ffffff',       // white ambient light
  ambientLightIntensity = 0.6,         // moderate intensity
  pointLightColor = '#ffffff',         // white point light
  pointLightIntensity = 0.8,           // moderate intensity
  pointLightPosition = [-10, 50, 60],  // above and slightly behind
}) => {
  const containerRef = useRef<HTMLDivElement>(null); // reference to div container
  const pointsRef = useRef<THREE.Points>();          // reference to Points object

  useEffect(() => {
    if (!containerRef.current) return;               // exit if no container
    const container = containerRef.current;

    // dynamic variables for smooth randomization
    let dynSwingPrev = swingAngle;                    // previous swing angle
    let dynSwingTarget = swingAngle;                  // target swing angle
    let dynSwing = swingAngle;                        // current interpolated swing
    let dynZoomPrev = zoomAmp;                        // previous zoom amplitude
    let dynZoomTarget = zoomAmp;                      // target zoom amplitude
    let dynZoom = zoomAmp;                            // current interpolated zoom
    let dynPulsePrev = pulseStrength;                 // previous pulse strength
    let dynPulseTarget = pulseStrength;               // target pulse strength
    let dynPulse = pulseStrength;                     // current interpolated pulse
    let nextRandomT = 0;                              // time for next random update
    let transitionStart = 0;                          // time when transition began
    const lerpDur = 1;                                // duration (sec) for smoothing transitions

    // 1) Initialize scene, camera, and renderer
    const scene = new THREE.Scene();                  // create scene
    const camera = new THREE.PerspectiveCamera(
      30,                                             // FOV in degrees (min:10, max:120)
      container.clientWidth / container.clientHeight, // aspect ratio
      0.1,                                            // near clipping plane (min:0.01)
      1000                                            // far clipping plane
    );
    camera.position.set(0, 50, 500);                  // place camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,                                // smooth edges
      alpha: true                                      // transparent background
    });
    renderer.setSize(container.clientWidth, container.clientHeight); // match container
    renderer.setPixelRatio(window.devicePixelRatio);   // match device resolution
    renderer.setClearColor(0x000000, 0);               // transparent black background
    container.appendChild(renderer.domElement);        // attach canvas to DOM

    // 2) Add helper lights (ignored by PointsMaterial)
    scene.add(new THREE.AmbientLight(ambientLightColor, ambientLightIntensity)); // ambient fill
    const pl = new THREE.PointLight(pointLightColor, pointLightIntensity);       // point light
    pl.position.set(...pointLightPosition);            // position the point light
    scene.add(pl);

    // 2.1) Prepare shading constants
    const lightDirVec = new THREE.Vector3(...lightDirection).normalize(); // normalized light dir
    const ambientI = shadingAmbient;              // ambient intensity
    const diffuseI = shadingDiffuse;              // diffuse intensity
    const baseColorObj = new THREE.Color(baseColor); // base color object

    // 3) Load model and sample particles
    const loader = new GLTFLoader();              // glTF loader
    let originalPositions: Float32Array;           // store original positions
    loader.load(
      modelUrl,
      (gltf) => {
        gltf.scene.rotation.x = Math.PI;            // flip model upside-down

        // merge all mesh geometries into one
        const geoms: THREE.BufferGeometry[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) geoms.push((o as THREE.Mesh).geometry);
        });
        const merged = BufferGeometryUtils.mergeBufferGeometries(geoms, false);

        // create surface sampler
        const mesh = new THREE.Mesh(merged);
        const sampler = new MeshSurfaceSampler(mesh).build();

        // allocate arrays for particle data
        const posArr = new Float32Array(particleCount * 3);
        const colArr = new Float32Array(particleCount * 3);
        const tempPos = new THREE.Vector3();
        const tempNorm = new THREE.Vector3();

        // sample points and compute baked shading
        for (let i = 0; i < particleCount; i++) {
          sampler.sample(tempPos, tempNorm);         // get random surface point + normal
          posArr[i*3]     = tempPos.x;
          posArr[i*3 + 1] = -tempPos.y;
          posArr[i*3 + 2] = tempPos.z;
          const ndotl = Math.max(tempNorm.normalize().dot(lightDirVec), 0); // N·L dot
          const shade = ambientI + diffuseI * ndotl;
          const shaded = baseColorObj.clone()
            .multiplyScalar(shade)
            .offsetHSL(0, 0, (Math.random()-0.5)*0.03); // slight hue jitter
          colArr.set([shaded.r, shaded.g, shaded.b], i*3);
        }
        originalPositions = posArr.slice();          // save for wave animation

        // build Points mesh
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
        const material = new THREE.PointsMaterial({
          size: particleSize,                      // particle diameter
          vertexColors: true,                      // use custom colors
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,                   // scale with distance
        });
        const points = new THREE.Points(geometry, material);
        scene.add(points);
        pointsRef.current = points;
      },
      undefined,
      (err) => console.error('GLTF load error:', err) // error handling
    );

    // 4) Animation loop with smooth random transitions
    const clock = new THREE.Clock();
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);  // schedule next frame
      const t = clock.getElapsedTime();          // elapsed time in seconds

      // trigger new random targets every 3–6s
      if (t > nextRandomT) {
        dynSwingPrev   = dynSwing;
        dynSwingTarget = Math.random() * swingAngle * 3;
        dynZoomPrev    = dynZoom;
        dynZoomTarget  = Math.random() * zoomAmp * 1.5;
        dynPulsePrev   = dynPulse;
        dynPulseTarget = Math.random() * pulseStrength * 0.5;
        transitionStart = t;
        nextRandomT = t + 3 + Math.random()*3;
      }
      // interpolation factor for smoothing
      const u = Math.min((t - transitionStart)/lerpDur, 1);
      dynSwing = THREE.MathUtils.lerp(dynSwingPrev, dynSwingTarget, u);
      dynZoom  = THREE.MathUtils.lerp(dynZoomPrev, dynZoomTarget, u);
      dynPulse = THREE.MathUtils.lerp(dynPulsePrev, dynPulseTarget, u);

      if (pointsRef.current) {
        // apply Y-axis swing
        pointsRef.current.rotation.y = Math.sin(t * swingSpeed) * dynSwing;
        // apply X-axis breath rotation
        pointsRef.current.rotation.x = 0.05 * Math.sin(breathSpeed * t);
        // apply scale pulse
        const scalePulse = 1 + 0.015 * Math.sin(dynPulse * t);
        pointsRef.current.scale.set(scalePulse, scalePulse, scalePulse);
        // apply Z-axis zoom
        pointsRef.current.position.z = dynZoom * Math.sin(t * zoomSpeed);
        // apply gentle wave on Z coordinate of each particle
        const arr = (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i=0; i<arr.length; i+=3) {
          arr[i+2] = originalPositions![i+2] + 0.005 * Math.sin(originalPositions![i]*3 + t);
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);           // render the scene
    };
    animate();

    // 5) Handle window resize for responsiveness
    const onResize = () => {
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

  return <div ref={containerRef} className={`relative ${size} ${className}`} />; // container for the canvas
};

export default ParticleAnimation; // export component
