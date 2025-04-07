
import React from 'react';
import ParticleAnimation from './ParticleAnimation';

interface LoadingAnimationProps {
  message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ message = "Processing your dream..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <ParticleAnimation size="h-40 w-40" className="mb-4" />
      <p className="text-center text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingAnimation;
