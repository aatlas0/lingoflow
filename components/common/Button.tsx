import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'px-6 py-3 font-bold rounded-lg transition-all duration-300 transform active:scale-95 focus:outline-none border-2 border-transparent';
  // Accessibility: focus-visible provides a clear outline only for keyboard users
  const focusClasses = 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-desert focus-visible:ring-brand-turquoise';

  const variantClasses = {
    primary: 'bg-brand-turquoise text-white hover:bg-[#006B6B] shadow-md hover:shadow-lg border-brand-turquoise',
    secondary: 'bg-deep-red text-white hover:bg-[#6B1730] shadow-md border-deep-red',
    ghost: 'bg-transparent text-brand-turquoise hover:bg-brand-turquoise/10 border-brand-turquoise',
  };

  return (
    <button
      className={`${baseClasses} ${focusClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};