
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
    const particleCount = 3000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Create face-like structure
    const createFaceShape = () => {
      // Face outline
      let particleIndex = 0;
      
      // Head shape (oval)
      const headParticles = 1500;
      const headRadius = 2.2;
      const headHeight = 2.8;
      
      for(let i = 0; i < headParticles; i++) {
        // Create oval-shaped head
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        // Oval shape by scaling
        positions[particleIndex] = headRadius * Math.sin(phi) * Math.cos(theta) * 0.8; // x (narrower)
        positions[particleIndex + 1] = headHeight * Math.sin(phi) * Math.sin(theta) * 0.7; // y (taller)
        positions[particleIndex + 2] = headRadius * Math.cos(phi) * 0.6; // z
        
        // Face particles are gold-tinted
        colors[particleIndex] = 0.83 + Math.random() * 0.17; // R
        colors[particleIndex + 1] = 0.69 + Math.random() * 0.11; // G
        colors[particleIndex + 2] = 0.22 + Math.random() * 0.08; // B
        
        particleIndex += 3;
      }
      
      // Eyes (two dense clusters)
      const eyeParticles = 300;
      const eyeRadius = 0.4;
      const eyeSpacing = 0.8;
      const eyeHeight = 0.5;
      
      // Left eye
      for(let i = 0; i < eyeParticles; i++) {
        const r = eyeRadius * Math.pow(Math.random(), 0.5);
        const theta = Math.random() * Math.PI * 2;
        
        positions[particleIndex] = -eyeSpacing + r * Math.cos(theta); // x
        positions[particleIndex + 1] = eyeHeight + r * Math.sin(theta) * 0.7; // y
        positions[particleIndex + 2] = 1.5 + Math.random() * 0.3; // z
        
        // Islamic green for eyes
        colors[particleIndex] = 0.04 + Math.random() * 0.06; // R
        colors[particleIndex + 1] = 0.37 + Math.random() * 0.1; // G
        colors[particleIndex + 2] = 0.22 + Math.random() * 0.08; // B
        
        particleIndex += 3;
      }
      
      // Right eye
      for(let i = 0; i < eyeParticles; i++) {
        const r = eyeRadius * Math.pow(Math.random(), 0.5);
        const theta = Math.random() * Math.PI * 2;
        
        positions[particleIndex] = eyeSpacing + r * Math.cos(theta); // x
        positions[particleIndex + 1] = eyeHeight + r * Math.sin(theta) * 0.7; // y
        positions[particleIndex + 2] = 1.5 + Math.random() * 0.3; // z
        
        // Islamic green for eyes
        colors[particleIndex] = 0.04 + Math.random() * 0.06; // R
        colors[particleIndex + 1] = 0.37 + Math.random() * 0.1; // G
        colors[particleIndex + 2] = 0.22 + Math.random() * 0.08; // B
        
        particleIndex += 3;
      }
      
      // Mouth (curved shape)
      const mouthParticles = 600;
      const mouthWidth = 1.2;
      const mouthHeight = -0.8;
      const mouthCurve = 0.3;
      
      for(let i = 0; i < mouthParticles; i++) {
        const t = (Math.random() - 0.5) * 2; // -1 to 1
        const yOffset = mouthCurve * Math.sin(t * Math.PI);
        
        positions[particleIndex] = t * mouthWidth; // x
        positions[particleIndex + 1] = mouthHeight + yOffset; // y
        positions[particleIndex + 2] = 1.5 + Math.random() * 0.3; // z
        
        // Gold tint for mouth
        colors[particleIndex] = 0.83 + Math.random() * 0.17; // R
        colors[particleIndex + 1] = 0.69 + Math.random() * 0.11; // G
        colors[particleIndex + 2] = 0.22 + Math.random() * 0.08; // B
        
        particleIndex += 3;
      }
    };
    
    createFaceShape();
    
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
      
      // Simulate looking around with gentle head movement
      animationTime.value += 0.01;
      
      // Make the face look around naturally
      const lookX = Math.sin(animationTime.value * 0.5) * 0.2; // Horizontal look
      const lookY = Math.sin(animationTime.value * 0.3) * 0.15; // Vertical look
      
      // Apply the look direction to the whole point cloud
      pointCloud.rotation.y = lookX;
      pointCloud.rotation.x = lookY;
      
      // Add subtle breathing/pulsing effect
      const breathScale = Math.sin(animationTime.value * 0.7) * 0.03 + 1;
      pointCloud.scale.set(breathScale, breathScale, breathScale);
      
      // Add subtle particle movement for life-like appearance
      const positionArray = pointCloud.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const originalX = originalPositions[idx];
        const originalY = originalPositions[idx + 1];
        const originalZ = originalPositions[idx + 2];
        
        // Apply gentle individual particle movement
        const noise = Math.sin(animationTime.value + i * 0.01) * 0.03;
        
        positionArray[idx] = originalX + noise;
        positionArray[idx + 1] = originalY + noise;
        positionArray[idx + 2] = originalZ + noise;
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
