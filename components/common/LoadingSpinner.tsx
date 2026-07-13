
import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; color?: 'teal' | 'white' }> = ({ size = 'md', color = 'teal' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
  };
  const colorClasses = {
    teal: 'border-gray-600 border-t-teal-500',
    white: 'border-white/30 border-t-white',
  };
  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full border-4 border-t-4 ${colorClasses[color]} ${sizeClasses[size]}`}
        // Accessibility: role="status" indicates loading state
        role="status" 
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};