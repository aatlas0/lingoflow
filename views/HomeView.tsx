
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { LANGUAGES } from '../constants/languages';
import { Button } from '../components/common/Button';
import type { Language } from '../types';

const LanguageSelector: React.FC<{
  label: string;
  value: Language;
  onChange: (lang: Language) => void;
  options: Language[];
}> = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isHighContrast } = useAppContext();

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (lang: Language) => {
    onChange(lang);
    setIsOpen(false);
  };

  return (
    <div className="w-full text-left relative" ref={containerRef}>
      <label className={`block text-xs font-bold mb-1 uppercase tracking-wider ${isHighContrast ? 'text-slate-400' : 'text-dark-green'}`}>
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-brand-turquoise focus:border-brand-turquoise shadow-sm cursor-pointer hover:border-brand-turquoise transition-all flex justify-between items-center
          ${isHighContrast
            ? 'bg-slate-800 border-slate-600 text-white'
            : 'bg-white border-desert-dark text-dark-green'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{value.name}</span>
        <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-xs ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-xl max-h-40 overflow-y-auto animate-fade-in-up
          ${isHighContrast ? 'bg-slate-800 border-slate-600' : 'bg-white border-desert-dark'}
        `}>
          <ul role="listbox">
            {options.map(lang => (
              <li
                key={lang.code}
                role="option"
                aria-selected={value.code === lang.code}
                onClick={() => handleSelect(lang)}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors
                  ${value.code === lang.code
                    ? (isHighContrast ? 'bg-brand-turquoise/30 font-bold text-white' : 'bg-brand-turquoise/20 font-bold text-dark-green')
                    : (isHighContrast ? 'text-slate-200 hover:bg-slate-700' : 'text-dark-green hover:bg-brand-turquoise/10')
                  }
                `}
              >
                {lang.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const HomeView = () => {
  const { sourceLang, setSourceLang, targetLang, setTargetLang, setView, isHighContrast, toggleHighContrast } = useAppContext();
  const { t } = useLocalization();

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-full p-6 lg:p-12 animate-fade-in relative gap-12 lg:gap-24">
      {/* Dark Mode Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleHighContrast}
          aria-pressed={isHighContrast}
          title={isHighContrast ? "Disable Dark Mode" : "Enable Dark Mode"}
          className={`p-3 rounded-full backdrop-blur-md transition-all shadow-lg border
            ${isHighContrast
              ? 'bg-slate-800/50 text-yellow-400 border-slate-600 hover:bg-slate-700/50'
              : 'bg-white/20 text-dark-green border-white/30 hover:bg-white/40'}
          `}
        >
          {isHighContrast ? '🌕' : '🌑'}
        </button>
      </div>

      {/* Left Side: Hero Text */}
      <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl">
        <div className="w-24 h-24 bg-gold rounded-full flex items-center justify-center text-dark-green font-bold text-5xl ring-4 ring-desert shadow-2xl mb-8 transform hover:scale-105 transition-transform">L</div>
        <h1 className={`text-5xl md:text-7xl font-extrabold mb-6 drop-shadow-sm leading-tight ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
          {(() => {
            // Highlight the app name without injecting translated text as HTML
            const title = t('home.title');
            const idx = title.indexOf('LingoFlow');
            if (idx === -1) return title;
            return (
              <>
                {title.slice(0, idx)}
                <span className="text-brand-turquoise">LingoFlow</span>
                {title.slice(idx + 'LingoFlow'.length)}
              </>
            );
          })()}
        </h1>
        <p className={`text-xl md:text-2xl mb-8 font-medium leading-relaxed ${isHighContrast ? 'text-slate-300' : 'text-dark-green/90'}`}>
          {t('home.subtitle')}
        </p>
      </div>

      {/* Right Side: Action Card */}
      <div className="flex-1 w-full max-w-sm">
        <div className={`backdrop-blur-xl p-5 md:p-6 rounded-3xl shadow-2xl border transform transition-all hover:scale-[1.01]
          ${isHighContrast
            ? 'bg-night-card/80 border-slate-700'
            : 'bg-white/70 border-white/60'}
        `}>
          <h2 className={`text-xl font-bold mb-4 text-center ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{t('home.startAdventure')}</h2>

          <div className="space-y-3 mb-5">
            <LanguageSelector
              label={t('home.sourceLangLabel')}
              value={sourceLang}
              onChange={setSourceLang}
              options={LANGUAGES}
            />

            <div className="flex items-center justify-center -my-2 relative z-10">
              <div className={`rounded-full p-1 shadow-sm border
                ${isHighContrast
                  ? 'bg-slate-800 border-slate-600'
                  : 'bg-white/80 border-desert/30'}
              `}>
                <span className={`text-lg ${isHighContrast ? 'text-slate-400' : 'text-dark-green/70'}`}>↓</span>
              </div>
            </div>

            <LanguageSelector
              label={t('home.targetLangLabel')}
              value={targetLang}
              onChange={setTargetLang}
              options={LANGUAGES}
            />
          </div>

          <Button onClick={() => setView('dashboard')} className="w-full text-lg py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-bold tracking-wide">
            {t('home.startAdventure')}
          </Button>
        </div>
      </div>
    </div>
  );
};