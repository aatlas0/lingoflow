import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/* Lumen Atlas surface: paper card on hairline border. Dark mode is handled
   globally — .high-contrast re-colors .bg-white to the night camp surface. */
export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div
    className={`bg-white/90 border border-desert-dark rounded-2xl shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'neutral' | 'act' | 'earned' | 'danger';
  className?: string;
}

/* Small pill for tags and badges. 'earned' is ember — XP, streaks, levels;
   'act' is teal — active/selected states; never mix the two roles. */
export const Chip: React.FC<ChipProps> = ({ children, variant = 'neutral', className = '', ...props }) => {
  const variantClasses = {
    neutral: 'bg-desert text-dark-green/70 border-desert-dark',
    act: 'bg-brand-turquoise/10 text-brand-turquoise border-brand-turquoise/30',
    earned: 'bg-ember-fill/15 text-ember border-ember-fill/30',
    danger: 'bg-deep-red/10 text-deep-red border-deep-red/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
