import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}

/* Lumen Atlas roles: teal is the ONLY action color. Secondary is a quiet
   outline (back/skip/alternative paths), ghost is bare, danger is deep-red
   and reserved for destructive actions. */
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'px-6 py-3 font-bold rounded-lg transition-all duration-150 transform active:scale-95 focus:outline-none border-2 border-transparent disabled:opacity-50 disabled:pointer-events-none';
  // Accessibility: focus-visible provides a clear outline only for keyboard users
  const focusClasses = 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-desert focus-visible:ring-brand-turquoise';

  const variantClasses = {
    primary: 'bg-brand-turquoise text-white hover:bg-[#0C5F58] shadow-md hover:shadow-lg border-brand-turquoise',
    secondary: 'bg-white text-dark-green border-desert-dark hover:border-brand-turquoise hover:text-brand-turquoise shadow-sm',
    ghost: 'bg-transparent text-brand-turquoise hover:bg-brand-turquoise/10 border-brand-turquoise',
    danger: 'bg-deep-red text-white hover:bg-[#881337] shadow-md border-deep-red',
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
