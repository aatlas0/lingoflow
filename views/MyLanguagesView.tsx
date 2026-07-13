import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { LANGUAGES, flagOf } from '../constants/languages';
import { fetchAllLanguageProgress, extractProgress, FRESH_LANGUAGE_PROGRESS } from '../services/progressService';
import { XP_PER_LEVEL } from '../constants/achievements';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Language, LanguageProgress } from '../types';

interface LanguageEntry {
    lang: Language;
    progress: LanguageProgress;
    isCurrent: boolean;
}

const LanguageCard: React.FC<{
    entry: LanguageEntry;
    onContinue: () => void;
}> = ({ entry, onContinue }) => {
    const { isHighContrast } = useAppContext();
    const { lang, progress, isCurrent } = entry;

    const xpIntoLevel = Math.max(0, progress.xp - (progress.level - 1) * XP_PER_LEVEL);
    const xpPct = Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100));

    return (
        <button
            onClick={onContinue}
            className={`group relative text-left rounded-3xl border-2 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise
                ${isCurrent
                    ? (isHighContrast ? 'bg-night-card border-brand-turquoise' : 'bg-white/90 border-brand-turquoise')
                    : (isHighContrast ? 'bg-night-card/70 border-slate-700 hover:border-brand-turquoise/60' : 'bg-white/70 border-gold/40 hover:border-brand-turquoise/60')}
                backdrop-blur-sm
            `}
        >
            {isCurrent && (
                <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest bg-brand-turquoise text-white px-2.5 py-1 rounded-full shadow">
                    Learning now
                </span>
            )}

            <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl drop-shadow-sm">{flagOf(lang.code)}</span>
                <div className="min-w-0">
                    <h3 className={`text-xl font-black truncate ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                        {lang.name}
                    </h3>
                    <p className={`text-sm font-bold ${isHighContrast ? 'text-teal-300' : 'text-brand-turquoise'}`}>
                        Level {progress.level}
                    </p>
                </div>
            </div>

            {/* XP toward the next level */}
            <div className="mb-4">
                <div className={`flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5
                    ${isHighContrast ? 'text-slate-400' : 'text-dark-green/50'}
                `}>
                    <span>XP</span>
                    <span>{xpIntoLevel} / {XP_PER_LEVEL}</span>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${isHighContrast ? 'bg-slate-800' : 'bg-dark-green/10'}`}>
                    <div
                        className="h-full bg-gradient-to-r from-brand-turquoise to-gold transition-all duration-500"
                        style={{ width: `${xpPct}%` }}
                    ></div>
                </div>
            </div>

            <div className={`flex items-center justify-between text-xs font-bold
                ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}
            `}>
                <span>🧠 {progress.quizzesCompleted} quizzes</span>
                <span>⚡ {progress.highScore} best</span>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity text-sm
                    ${isHighContrast ? 'text-brand-turquoise' : 'text-gold'}
                `}>
                    {isCurrent ? 'Open ➜' : 'Continue ➜'}
                </span>
            </div>
        </button>
    );
};

export const MyLanguagesView: React.FC = () => {
    const { profile, targetLang, sourceLang, setTargetLang, setView, isHighContrast } = useAppContext();
    const { user } = useAuth();
    const [summaries, setSummaries] = useState<{ langCode: string; progress: LanguageProgress }[] | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        if (!user) { setSummaries([]); return; }
        let cancelled = false;
        fetchAllLanguageProgress(user.id).then(rows => {
            if (!cancelled) setSummaries(rows);
        });
        return () => { cancelled = true; };
    }, [user?.id]);

    const entries: LanguageEntry[] = useMemo(() => {
        const byCode = new Map<string, LanguageProgress>();
        (summaries ?? []).forEach(s => byCode.set(s.langCode, s.progress));
        // The active language's freshest numbers live in the profile, which
        // may be ahead of the last debounced save.
        byCode.set(targetLang.code, extractProgress(profile));

        return [...byCode.entries()]
            .map(([code, progress]) => {
                const lang = LANGUAGES.find(l => l.code === code);
                return lang ? { lang, progress, isCurrent: code === targetLang.code } : null;
            })
            .filter((e): e is LanguageEntry => e !== null)
            .sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0) || b.progress.xp - a.progress.xp);
    }, [summaries, targetLang.code, profile]);

    const startedCodes = new Set(entries.map(e => e.lang.code));
    const availableLanguages = LANGUAGES.filter(l => !startedCodes.has(l.code) && l.code !== sourceLang.code);

    const switchTo = (lang: Language) => {
        setPickerOpen(false);
        if (lang.code !== targetLang.code) setTargetLang(lang);
        setView('dashboard');
    };

    return (
        <div className="flex flex-col w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
            <div className="shrink-0 mb-6">
                <h1 className={`text-3xl md:text-4xl font-black drop-shadow-sm ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    🌍 My Languages
                </h1>
                <p className={`mt-1 font-medium ${isHighContrast ? 'text-slate-400' : 'text-dark-green/70'}`}>
                    Each language keeps its own level, XP, mistakes and lessons — switch any time, nothing is lost.
                </p>
            </div>

            {summaries === null ? (
                <div className="flex-grow flex items-center justify-center py-20">
                    <LoadingSpinner size="lg" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
                    {entries.map(entry => (
                        <LanguageCard key={entry.lang.code} entry={entry} onContinue={() => switchTo(entry.lang)} />
                    ))}

                    {/* Start a new language */}
                    <button
                        onClick={() => setPickerOpen(v => !v)}
                        className={`rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 min-h-[190px] transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise
                            ${isHighContrast
                                ? 'border-slate-600 text-slate-400 hover:border-brand-turquoise hover:text-brand-turquoise bg-night-card/40'
                                : 'border-dark-green/30 text-dark-green/60 hover:border-brand-turquoise hover:text-brand-turquoise bg-white/40'}
                        `}
                    >
                        <span className="text-4xl">➕</span>
                        <span className="font-black">Start a new language</span>
                        <span className="text-xs font-medium opacity-70">Begins fresh at Level 1</span>
                    </button>
                </div>
            )}

            {/* New-language picker */}
            {pickerOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`w-full max-w-2xl max-h-[75vh] overflow-y-auto rounded-3xl border-2 p-6 shadow-2xl
                            ${isHighContrast ? 'bg-night-card border-slate-700' : 'bg-desert border-gold'}
                        `}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className={`text-xl font-black ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                                Pick your next language
                            </h2>
                            <button
                                onClick={() => setPickerOpen(false)}
                                className={`p-1.5 rounded-full font-bold ${isHighContrast ? 'text-slate-400 hover:text-white' : 'text-dark-green/50 hover:text-dark-green'}`}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availableLanguages.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => switchTo(lang)}
                                    className={`flex items-center gap-3 rounded-2xl border-2 p-3 font-bold transition-all hover:-translate-y-0.5 hover:border-brand-turquoise
                                        ${isHighContrast
                                            ? 'bg-slate-800 border-slate-600 text-white'
                                            : 'bg-white/80 border-white text-dark-green'}
                                    `}
                                >
                                    <span className="text-2xl">{flagOf(lang.code)}</span>
                                    <span className="text-sm text-left leading-tight">{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
