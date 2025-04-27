import React, { useRef, useEffect } from 'react'; // React core + hooks
import * as THREE from 'three'; // Three.js core

interface ParticleAnimationProps {
  size?: string;       // Tailwind classes: container size (e.g. 'h-60 w-60')
  className?: string;  // Additional CSS classes
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({ 
  size = "h-60 w-60", 
  className = "" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);                   // ref to mount Three.js
  const pointer = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 }); // normalized pointer pos [0,1]

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1) Init scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,                                   // FOV (deg)
      container.clientWidth / container.clientHeight, // aspect ratio
      0.1,                                  // near plane
      1000                                  // far plane
    );
    camera.position.z = 6;                  // pull camera back

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight); // match container
    renderer.setClearColor(0x000000, 0);     // transparent bg
    container.appendChild(renderer.domElement);

    // 2) Create point cloud geometry + colors
    const particleCount = 5000;              // total dots
    const positions = new Float32Array(particleCount * 3); // xyz
    const colors    = new Float32Array(particleCount * 3); // rgb
    const originalPositions = new Float32Array(particleCount * 3); // backup for wave
    const radius = 2.5;                      // sphere radius
    const color = new THREE.Color();         // helper color

    for (let i = 0; i < particleCount; i++) {
      // spherical coordinates for even distribution
      const phi   = Math.acos(2 * Math.random() - 1);        // phi ∈ [0,π]
      const theta = 2 * Math.PI * Math.random();             // theta ∈ [0,2π]
      const r     = radius * (0.95 + Math.random() * 0.1);   // randomize radius ±5%

      // compute cartesian
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions.set([x, y, z], i * 3);
      originalPositions.set([x, y, z], i * 3);

      // color: 5% gold, 95% dark green
      if (Math.random() < 0.05) {
        color.setRGB(
          0.85 + Math.random() * 0.15, // R (0.85–1.0)
          0.7  + Math.random() * 0.1,  // G (0.7–0.8)
          0.2  + Math.random() * 0.05  // B (0.2–0.25)
        );
      } else {
        color.setRGB(
          0.03 + Math.random() * 0.04, // R (0.03–0.07)
          0.3  + Math.random() * 0.08, // G (0.3–0.38)
          0.15 + Math.random() * 0.06  // B (0.15–0.21)
        );
      }
      colors.set([color.r, color.g, color.b], i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    const material = new THREE.PointsMaterial({
      size: 0.04,                      // dot size (0.01–0.1)
      vertexColors: true,              // use per-vertex colors
      transparent: true,               // allow opacity
      opacity: 0.8,                    // dot opacity
      blending: THREE.AdditiveBlending // glow effect
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    // 3) Global pointer interaction: map mouse/touch anywhere on page to normalized [0,1]
    const updatePointer = (e: MouseEvent | TouchEvent) => {
      let x = 0.5, y = 0.5;
      if (e instanceof MouseEvent) {
        x = e.clientX / window.innerWidth;
        y = 1 - e.clientY / window.innerHeight;
      } else if ('touches' in e && e.touches[0]) {
        x = e.touches[0].clientX / window.innerWidth;
        y = 1 - e.touches[0].clientY / window.innerHeight;
      }
      // clamp to [0,1]
      pointer.current.x = THREE.MathUtils.clamp(x, 0, 1);
      pointer.current.y = THREE.MathUtils.clamp(y, 0, 1);
    };
    window.addEventListener('mousemove', updatePointer);
    window.addEventListener('touchmove', updatePointer);

    // 4) Animation loop
    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // constant rotation around Y
      pointCloud.rotation.y = t * 0.3;
      
      // interactive X-rotation: amplitude 0–0.5 rad based on pointer.x
      pointCloud.rotation.x = Math.sin(t * 0.2) * pointer.current.x * 0.5;
      
      // interactive pulse: scale fluctuation amplitude 0–0.05 based on pointer.y
      const pulse = Math.sin(t * 0.7) * pointer.current.y * 0.05;
      pointCloud.scale.set(1 + pulse, 1 + pulse, 1 + pulse);

      // wave effect: radial movement
      const posArr = (geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const ox = originalPositions[idx], oy = originalPositions[idx + 1], oz = originalPositions[idx + 2];
        const d  = Math.sqrt(ox*ox + oy*oy + oz*oz);
        const w  = 0.05 * Math.sin(d * 2 - t * 2);
        posArr[idx]     = ox * (1 + w);
        posArr[idx + 1] = oy * (1 + w);
        posArr[idx + 2] = oz * (1 + w);
      }
      geometry.attributes.position.needsUpdate = true; // inform Three.js of changes

      renderer.render(scene, camera);
    };
    animate();

    // 5) Handle resize
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      cancelAnimationFrame(frameId!);
      window.removeEventListener('mousemove', updatePointer);
      window.removeEventListener('touchmove', updatePointer);
      window.removeEventListener('resize', onResize);
      renderer.dispose(); geometry.dispose(); material.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} className={`${size} ${className}`} /> // container for renderer
  );
};

export default ParticleAnimation;
