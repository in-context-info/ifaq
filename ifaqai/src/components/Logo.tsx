import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

export function Logo({ size = 'md', className = '', alt = 'Company Logo' }: LogoProps) {
  return (
    <img
      src="/assets/logo.png"
      alt={alt}
      className={`${sizeClasses[size]} w-auto ${className}`}
    />
  );
}

