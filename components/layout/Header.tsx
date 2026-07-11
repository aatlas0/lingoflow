
import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useImmersion } from '../../contexts/ImmersionContext';

export const Header = () => {
    const { isHighContrast, toggleHighContrast, profile, currentView, setView } = useAppContext();
    const { username, signOut } = useAuth();
    const { t: locT, forceNative, setForceNative, isTargetLanguageActive } = useLocalization();
    const { immersionLevel, setImmersionLevel } = useImmersion();

    // The user requested the menu not appear in the beginning (Home view).
    if (currentView === 'home') return null;

    const showLanguageToggle = profile.level > 20;
    // Show back button if we are NOT in home or dashboard
    const showBackButton = currentView !== 'home' && currentView !== 'dashboard';

    return (
        <header className={`shadow-lg border-b-4 relative z-10 transition-all duration-300
            ${isHighContrast
                ? 'bg-slate-900 border-slate-700'
                : 'bg-dark-green border-gold'}
        `}>
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        {showBackButton && (
                            <button
                                onClick={() => setView('dashboard')}
                                className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-full p-1
                                    ${isHighContrast ? 'text-slate-400 hover:text-white' : 'text-desert hover:text-white'}
                                `}
                                aria-label={locT('header.back')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                        )}

                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center gap-2 focus:outline-none cursor-pointer"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ring-2 shadow-md
                                ${isHighContrast
                                    ? 'bg-brand-turquoise text-white ring-slate-600'
                                    : 'bg-gold text-dark-green ring-desert'}
                            `}>L</div>
                            <span className={`font-bold text-xl tracking-wider hidden sm:block
                                ${isHighContrast ? 'text-white' : 'text-desert'}
                            `}>LingoFlow</span>
                        </button>
                    </div>

                    {/* Immersion Debug Slider */}
                    <div className="hidden md:flex items-center gap-2 mx-4 bg-black/20 px-3 py-1 rounded-full">
                        <span className={`text-xs font-bold uppercase ${isHighContrast ? 'text-teal-300' : 'text-gold'}`}>Immersion: {immersionLevel}%</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={immersionLevel}
                            onChange={(e) => setImmersionLevel(parseInt(e.target.value))}
                            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-turquoise"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {showLanguageToggle && (
                            <button
                                onClick={() => setForceNative(!forceNative)}
                                aria-pressed={!forceNative}
                                title={isTargetLanguageActive ? locT('header.toggle.nativeLang') : locT('header.toggle.targetLang')}
                                className={`p-2 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold text-xl
                                    ${isHighContrast ? 'text-slate-300' : 'text-desert'}
                                `}
                            >
                                {isTargetLanguageActive ? '🌐' : '🇬🇧'}
                            </button>
                        )}

                        <button
                            onClick={toggleHighContrast}
                            // Accessibility: aria-pressed indicates toggle state
                            aria-pressed={isHighContrast}
                            title={isHighContrast ? "Disable Dark Mode" : "Enable Dark Mode"}
                            className={`p-2 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ml-1
                                ${isHighContrast ? 'text-brand-turquoise' : 'text-desert'}
                            `}
                        >
                            {isHighContrast ? '🌕' : '🌑'}
                        </button>

                        {username && (
                            <span className={`hidden sm:block text-sm font-bold ml-2 ${isHighContrast ? 'text-slate-300' : 'text-desert'}`}>
                                {username}
                            </span>
                        )}
                        <button
                            onClick={() => signOut()}
                            title="Log out"
                            className={`p-2 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ml-1 text-xl
                                ${isHighContrast ? 'text-slate-300' : 'text-desert'}
                            `}
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </nav>
        </header>
    );
};