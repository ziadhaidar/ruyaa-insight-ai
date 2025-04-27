
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
    
    // Create particles - increased count for more density
    const particleCount = 5000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Sphere setup with more varied distribution
    const radius = 2.5;
    
    for(let i = 0; i < particleCount; i++) {
      // Use spherical coordinates for even distribution
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      
      // Add slight randomness for more natural look
      const randRadius = radius * (0.95 + Math.random() * 0.1);
      
      // Convert spherical to cartesian coordinates
      positions[i * 3] = randRadius * Math.sin(phi) * Math.cos(theta);     // x
      positions[i * 3 + 1] = randRadius * Math.sin(phi) * Math.sin(theta); // y
      positions[i * 3 + 2] = randRadius * Math.cos(phi);                   // z
      
      // Use predominantly dark green with sparse gold particles (only ~5% gold)
      const isGold = Math.random() < 0.05; // Only 5% chance of being gold
      
      if (isGold) {
        // Gold particles - slightly brighter to stand out
        colors[i * 3] = 0.85 + Math.random() * 0.15;     // R
        colors[i * 3 + 1] = 0.70 + Math.random() * 0.10; // G
        colors[i * 3 + 2] = 0.20 + Math.random() * 0.10; // B
      } else {
        // Dark green particles - with subtle variations
        colors[i * 3] = 0.03 + Math.random() * 0.04;     // R
        colors[i * 3 + 1] = 0.30 + Math.random() * 0.08; // G
        colors[i * 3 + 2] = 0.15 + Math.random() * 0.06; // B
      }
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.04, // Smaller particles for a more refined look
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
      animationTime.value += 0.005; // Slower, smoother animation
      
      // Rotate the sphere
      pointCloud.rotation.y = animationTime.value * 0.3;
      pointCloud.rotation.x = Math.sin(animationTime.value * 0.2) * 0.2;
      
      // Gently pulse the sphere
      const pulseScale = 1 + Math.sin(animationTime.value * 0.7) * 0.03;
      pointCloud.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Add subtle wave-like movement to particles
      const positionArray = pointCloud.geometry.attributes.position.array as Float32Array;
      
      for(let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const originalX = originalPositions[idx];
        const originalY = originalPositions[idx + 1];
        const originalZ = originalPositions[idx + 2];
        
        // Calculate distance from origin for wave effect
        const distance = Math.sqrt(
          originalX * originalX + 
          originalY * originalY + 
          originalZ * originalZ
        );
        
        // Wave effect that moves outward
        const waveFactor = 0.05 * Math.sin(distance * 2 - animationTime.value * 2);
        
        // Apply wave with original position
        positionArray[idx] = originalX * (1 + waveFactor);
        positionArray[idx + 1] = originalY * (1 + waveFactor);
        positionArray[idx + 2] = originalZ * (1 + waveFactor);
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
