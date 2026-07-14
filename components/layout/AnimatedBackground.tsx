import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

// Lumen Atlas ground: static topographic contour lines instead of the old
// 30 floating animated characters — on-brand (an atlas), calmer, and free
// at render time. Color follows the theme via currentColor.
export const AnimatedBackground = () => {
  const { isHighContrast } = useAppContext();

  return (
    <div
      className={`absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none ${isHighContrast ? 'text-night-text' : 'text-dark-green'}`}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: isHighContrast ? 0.05 : 0.045 }}
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M-40 110 C 200 40, 420 190, 640 120 S 1080 30, 1260 140" />
          <path d="M-40 210 C 220 130, 430 280, 660 205 S 1090 115, 1260 230" />
          <path d="M-40 320 C 240 240, 440 390, 680 315 S 1100 220, 1260 340" />
          <path d="M-40 440 C 250 360, 450 510, 690 435 S 1110 340, 1260 460" />
          <path d="M-40 570 C 260 490, 460 640, 700 560 S 1120 465, 1260 590" />
          <path d="M-40 700 C 270 620, 470 770, 710 690 S 1130 595, 1260 720" />
        </g>
      </svg>
    </div>
  );
};
