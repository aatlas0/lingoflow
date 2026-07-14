import React from 'react';

interface JourneyLineProps {
  /** 0..1 — how far along the path the traveller dot sits. */
  progress?: number;
  className?: string;
}

/* The Lumen Atlas motif: a dashed expedition route with a traveller dot.
   Decorative — colors follow the theme via currentColor (line) and the
   teal/ember tokens (progress and dot). */
export const JourneyLine: React.FC<JourneyLineProps> = ({ progress = 1, className = '' }) => {
  const clamped = Math.max(0, Math.min(1, progress));
  // The path spans x=10..290; the dot rides the same gentle curve.
  const dotX = 10 + clamped * 280;
  const dotY = 14 + Math.sin(clamped * Math.PI) * -6;

  return (
    <svg
      viewBox="0 0 300 24"
      className={`w-full h-6 text-desert-dark ${className}`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M10 14 C 80 6, 150 20, 220 10 S 280 12, 290 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        strokeLinecap="round"
      />
      {clamped > 0 && (
        <circle cx={dotX} cy={dotY} r="4" className="fill-brand-turquoise" />
      )}
      <circle cx="290" cy="8" r="2.5" className="fill-ember-fill" opacity="0.9" />
    </svg>
  );
};
