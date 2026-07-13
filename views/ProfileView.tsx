import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { ACHIEVEMENTS, XP_PER_LEVEL } from '../constants/achievements';
import { LANGUAGES, flagOf } from '../constants/languages';
import { fetchAllLanguageProgress, extractProgress } from '../services/progressService';
import type { LanguageProgress } from '../types';

const XPBar: React.FC<{ xp: number; level: number }> = ({ xp, level }) => {
    const { t } = useLocalization();
    const { isHighContrast } = useAppContext();
    const currentLevelXp = xp - (level - 1) * XP_PER_LEVEL;
    const progressPercentage = Math.min((currentLevelXp / XP_PER_LEVEL) * 100, 100);

    return (
        <div>
            <div className={`flex justify-between mb-2 text-sm font-bold uppercase tracking-wide ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                <span>{t('profile.level', { level })}</span>
                <span>{t('profile.xp', { xp: currentLevelXp, totalXp: XP_PER_LEVEL })}</span>
            </div>
            <div className={`w-full rounded-full h-6 overflow-hidden shadow-inner border ${isHighContrast ? 'bg-slate-700 border-slate-600' : 'bg-desert-dark border-desert-dark'}`}>
                {/* The animation is triggered by the CSS transition property when the width changes */}
                <div
                    className="bg-deep-red h-6 rounded-full transition-all duration-700 ease-out relative"
                    style={{ width: `${progressPercentage}%` }}
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10"></div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: string }> = ({ label, value, icon }) => {
    const { isHighContrast } = useAppContext();
    return (
        <div className={`p-6 rounded-xl flex items-center gap-4 shadow-sm border hover:shadow-md transition-shadow
            ${isHighContrast
                ? 'bg-night-card border-slate-700'
                : 'bg-white border-desert-dark'}
        `}>
            <span className="text-4xl text-gold filter drop-shadow-sm">{icon}</span>
            <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>{label}</p>
                <p className={`text-2xl font-bold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{value}</p>
            </div>
        </div>
    );
};

const AchievementIcon: React.FC<{ achievementId: string; isUnlocked: boolean }> = ({ achievementId, isUnlocked }) => {
    const { t } = useLocalization();
    const { isHighContrast } = useAppContext();
    const achievement = ACHIEVEMENTS[achievementId];

    const baseClasses = "text-center p-4 rounded-xl border-2 transition-all";
    const unlockedClasses = isHighContrast
        ? 'bg-night-card border-gold shadow-md transform hover:-translate-y-1'
        : 'bg-white border-gold shadow-md transform hover:-translate-y-1';
    const lockedClasses = isHighContrast
        ? 'bg-slate-800 border-slate-700 opacity-50 grayscale'
        : 'bg-gray-100 border-gray-200 opacity-50 grayscale';

    return (
        <div className={`${baseClasses} ${isUnlocked ? unlockedClasses : lockedClasses}`}>
            <div className="text-4xl mb-3">{achievement.icon}</div>
            <p className={`font-bold text-sm mb-1 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{achievement.name}</p>
            <p className={`text-xs leading-tight ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>{isUnlocked ? achievement.description : t('profile.locked')}</p>
        </div>
    );
}

// Every started language with its own saved level — the visible proof that
// switching languages never mixes or loses progress.
const LanguagesStrip: React.FC = () => {
    const { profile, targetLang, setView, isHighContrast } = useAppContext();
    const { user } = useAuth();
    const [rows, setRows] = useState<{ langCode: string; progress: LanguageProgress }[]>([]);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        fetchAllLanguageProgress(user.id).then(data => {
            if (!cancelled) setRows(data);
        });
        return () => { cancelled = true; };
    }, [user?.id]);

    const byCode = new Map<string, LanguageProgress>(rows.map(r => [r.langCode, r.progress]));
    byCode.set(targetLang.code, extractProgress(profile)); // live numbers win
    const entries = [...byCode.entries()]
        .map(([code, progress]) => ({ lang: LANGUAGES.find(l => l.code === code), progress, isCurrent: code === targetLang.code }))
        .filter(e => e.lang)
        .sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0) || b.progress.xp - a.progress.xp);

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold border-b-4 border-gold inline-block pb-1 px-2 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    🌍 My Languages
                </h2>
                <button
                    onClick={() => setView('languages')}
                    className={`text-sm underline font-bold hover:text-brand-turquoise ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}
                >
                    Manage
                </button>
            </div>
            <div className="space-y-3">
                {entries.map(({ lang, progress, isCurrent }) => {
                    const xpIntoLevel = Math.max(0, progress.xp - (progress.level - 1) * XP_PER_LEVEL);
                    const pct = Math.min(100, (xpIntoLevel / XP_PER_LEVEL) * 100);
                    return (
                        <div
                            key={lang!.code}
                            className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm
                                ${isCurrent
                                    ? (isHighContrast ? 'bg-night-card border-brand-turquoise' : 'bg-white border-brand-turquoise')
                                    : (isHighContrast ? 'bg-night-card/60 border-slate-700' : 'bg-white/60 border-desert-dark')}
                            `}
                        >
                            <span className="text-3xl shrink-0">{flagOf(lang!.code)}</span>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`font-bold truncate ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{lang!.name}</p>
                                    {isCurrent && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-brand-turquoise text-white px-2 py-0.5 rounded-full shrink-0">
                                            Now
                                        </span>
                                    )}
                                </div>
                                <div className={`mt-1.5 h-2 rounded-full overflow-hidden max-w-xs ${isHighContrast ? 'bg-slate-800' : 'bg-dark-green/10'}`}>
                                    <div className="h-full bg-gradient-to-r from-brand-turquoise to-gold" style={{ width: `${pct}%` }}></div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`font-black ${isHighContrast ? 'text-teal-300' : 'text-brand-turquoise'}`}>Lv {progress.level}</p>
                                <p className={`text-xs font-bold ${isHighContrast ? 'text-slate-400' : 'text-dark-green/50'}`}>{progress.xp} XP</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ProfileView = () => {
    const { profile, isHighContrast, targetLang } = useAppContext();
    const { t } = useLocalization();

    return (
        <div className="w-full h-full max-w-7xl mx-auto p-4 flex flex-col overflow-hidden animate-fade-in">
            <div className="shrink-0 text-center mb-6 md:mb-10">
                <h1 className={`text-3xl md:text-5xl font-bold mb-2 drop-shadow-sm ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{t('profile.title')}</h1>
                <p className={`text-sm font-bold uppercase tracking-widest ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                    {flagOf(targetLang.code)} Your journey in {targetLang.name} · progress is saved per language
                </p>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 pb-10 custom-scrollbar">
                {/* Top Section: XP Bar */}
                <div className={`backdrop-blur-sm p-6 md:p-8 rounded-3xl shadow-xl border mb-8
                    ${isHighContrast
                        ? 'bg-night-card/60 border-slate-700'
                        : 'bg-white/60 border-white'}
                `}>
                    <XPBar xp={profile.xp} level={profile.level} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
                    <StatCard label={t('profile.stat.highScore')} value={profile.highScore} icon="⚡️" />
                    <StatCard label={t('profile.stat.quizzesCompleted')} value={profile.quizzesCompleted} icon="🧠" />
                    <StatCard label={t('profile.stat.totalXp')} value={profile.xp} icon="✨" />
                </div>

                {/* Per-language progress */}
                <LanguagesStrip />

                {/* Achievements Section */}
                <div>
                    <h2 className={`text-2xl font-bold mb-6 border-b-4 border-gold inline-block pb-1 px-2 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{t('profile.achievements')}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Object.keys(ACHIEVEMENTS).map(id => (
                            <AchievementIcon key={id} achievementId={id} isUnlocked={profile.unlockedAchievements.includes(id)} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};