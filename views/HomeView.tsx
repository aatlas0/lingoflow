
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { LANGUAGES, flagOf } from '../constants/languages';
import { Button } from '../components/common/Button';
import type { Language } from '../types';

// One step of the onboarding wizard: a scrollable single-select language list.
const LanguagePickList: React.FC<{
  options: Language[];
  selected: Language | null;
  onSelect: (lang: Language) => void;
}> = ({ options, selected, onSelect }) => {
  const { isHighContrast } = useAppContext();
  return (
    <div
      role="listbox"
      className={`max-h-64 overflow-y-auto rounded-xl border p-1.5 space-y-1
        ${isHighContrast ? 'border-slate-600 bg-slate-900/40' : 'border-desert-dark/40 bg-white/50'}
      `}
    >
      {options.map(lang => {
        const isActive = selected?.code === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect(lang)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-3
              ${isActive
                ? 'bg-brand-turquoise text-white shadow-md'
                : (isHighContrast ? 'text-slate-200 hover:bg-slate-700' : 'text-dark-green hover:bg-brand-turquoise/10')}
            `}
          >
            <span className="text-xl">{flagOf(lang.code)}</span>
            <span className="flex-1">{lang.name}</span>
            {isActive && <span>✓</span>}
          </button>
        );
      })}
    </div>
  );
};

export const HomeView = () => {
  const { setSourceLang, setTargetLang, setView, isHighContrast, toggleHighContrast } = useAppContext();
  const { t } = useLocalization();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [native, setNative] = React.useState<Language | null>(null);
  const [target, setTarget] = React.useState<Language | null>(null);

  // Committing the pair kicks off hydration for the target language, then the
  // placement flow takes over (level → interests → test → roadmap).
  const startJourney = () => {
    if (!native || !target) return;
    setSourceLang(native);
    setTargetLang(target);
    setView('placement');
  };

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

      {/* Right Side: Onboarding Card */}
      <div className="flex-1 w-full max-w-sm">
        <div className={`backdrop-blur-xl p-5 md:p-6 rounded-3xl shadow-2xl border transform transition-all
          ${isHighContrast
            ? 'bg-night-card/80 border-slate-700'
            : 'bg-white/70 border-white/60'}
        `}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 text-center ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
            Step {step} of 2
          </p>
          <h2 className={`text-xl font-bold mb-4 text-center ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
            {step === 1 ? 'Which language do you speak?' : 'Which language do you want to learn?'}
          </h2>

          {step === 1 ? (
            <>
              <div className="mb-4">
                <LanguagePickList
                  options={LANGUAGES}
                  selected={native}
                  onSelect={lang => {
                    setNative(lang);
                    if (target?.code === lang.code) setTarget(null);
                  }}
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!native}
                className="w-full text-lg py-3 shadow-lg font-bold tracking-wide"
              >
                Next →
              </Button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <LanguagePickList
                  options={LANGUAGES.filter(l => l.code !== native?.code)}
                  selected={target}
                  onSelect={setTarget}
                />
              </div>
              <p className={`text-xs mb-3 text-center ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                One language at a time — you can add more later from My Languages.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setStep(1)} variant="ghost" className="px-4">←</Button>
                <Button
                  onClick={startJourney}
                  disabled={!target}
                  className="flex-1 text-lg py-3 shadow-lg font-bold tracking-wide"
                >
                  {t('home.startAdventure')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};