
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface ParticleAnimationProps {
  size?: string;
  className?: string;
}

const ParticleAnimation: React.FC<ParticleAnimationProps> = ({ 
  size = "h-60 w-60", 
  className = "" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize Three.js scene
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      1000
    );
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    // Create particles
    const particleCount = 2000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Particle sphere setup
    const radius = 3;
    
    for (let i = 0; i < particleCount; i++) {
      // Use spherical coordinates for initial positioning
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      
      // Convert spherical to cartesian coordinates
      positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi); // x
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi); // y
      positions[i * 3 + 2] = radius * Math.cos(theta); // z
      
      // Use Islamic green and gold colors
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        // Islamic green with variations
        colors[i * 3] = 0.04 + Math.random() * 0.06; // R
        colors[i * 3 + 1] = 0.37 + Math.random() * 0.1; // G
        colors[i * 3 + 2] = 0.22 + Math.random() * 0.08; // B
      } else {
        // Islamic gold with variations
        colors[i * 3] = 0.83 + Math.random() * 0.17; // R
        colors[i * 3 + 1] = 0.69 + Math.random() * 0.11; // G
        colors[i * 3 + 2] = 0.22 + Math.random() * 0.08; // B
      }
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const pointCloud = new THREE.Points(particles, particleMaterial);
    scene.add(pointCloud);
    
    // Position camera
    camera.position.z = 6;
    
    // Animation variables
    const originalPositions = positions.slice();
    const targetPositions = new Float32Array(positions.length);
    
    // Save references
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    particlesRef.current = pointCloud;
    
    // Animation loop
    let frameId: number;
    const animationTime = { value: 0 };
    
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      
      // Rotate the entire point cloud
      pointCloud.rotation.y += 0.002;
      pointCloud.rotation.x += 0.001;
      
      // Gently pulsate the particle positions
      animationTime.value += 0.01;
      const positionArray = pointCloud.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const originalX = originalPositions[idx];
        const originalY = originalPositions[idx + 1];
        const originalZ = originalPositions[idx + 2];
        
        // Apply gentle pulsating movement
        const pulseFactor = Math.sin(animationTime.value + i * 0.01) * 0.1 + 1;
        
        positionArray[idx] = originalX * pulseFactor;
        positionArray[idx + 1] = originalY * pulseFactor;
        positionArray[idx + 2] = originalZ * pulseFactor;
      }
      
      // Flag geometry for update
      pointCloud.geometry.attributes.position.needsUpdate = true;
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const container = containerRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (renderer && container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);
  
  return (
    <div ref={containerRef} className={`${size} ${className}`} />
  );
};

export default ParticleAnimation;
