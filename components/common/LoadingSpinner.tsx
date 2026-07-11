
import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
  };
  return (
    <div className="flex justify-center items-center">
      <div
        className={`animate-spin rounded-full border-4 border-t-4 border-gray-600 border-t-teal-500 ${sizeClasses[size]}`}
        // Accessibility: role="status" indicates loading state
        role="status" 
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};