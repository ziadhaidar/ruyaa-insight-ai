
import React from 'react';
import ParticleAnimation from './ParticleAnimation';

interface LoadingAnimationProps {
  message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ message = "Processing your dream..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        <ParticleAnimation size="h-48 w-48" className="mb-4" />
        <div className="absolute bottom-0 w-full flex justify-center">
          <span className="text-xs text-islamic-gold opacity-70">AI wisdom</span>
        </div>
      </div>
      <p className="text-center text-muted-foreground animate-pulse mt-2">{message}</p>
    </div>
  );
};

export default LoadingAnimation;
