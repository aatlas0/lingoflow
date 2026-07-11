import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

const characters = '你好世界こんにちは안녕하세요你好嗎नमस्तेПриветBonjourHalloCiaoOláDariaja'.split('');

// Animation logic is handled via CSS keyframes defined inline here
const styles = `
@keyframes float {
  0% { transform: translateY(0); opacity: 0.5; }
  100% { transform: translateY(-100vh); opacity: 0; }
}
.floating-char {
  animation: float linear infinite;
}
`;

export const AnimatedBackground = () => {
  const { isHighContrast } = useAppContext();

  return (
    <>
      <style>{styles}</style>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => {
          const style = {
            left: `${Math.random() * 100}vw`,
            fontSize: `${Math.random() * 1.5 + 0.5}rem`,
            animationDuration: `${Math.random() * 20 + 15}s`,
            animationDelay: `${Math.random() * -30}s`,
          };
          return (
            <span
              key={i}
              className={`absolute floating-char font-serif ${isHighContrast ? 'text-white/10' : 'text-dark-green/5'}`}
              style={style}
            >
              {characters[i % characters.length]}
            </span>
          );
        })}
      </div>
    </>
  );
};