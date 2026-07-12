import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { ACHIEVEMENTS, XP_PER_LEVEL } from '../constants/achievements';

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

export const ProfileView = () => {
    const { profile, isHighContrast, targetLang } = useAppContext();
    const { t } = useLocalization();

    return (
        <div className="w-full h-full max-w-7xl mx-auto p-4 flex flex-col overflow-hidden animate-fade-in">
            <div className="shrink-0 text-center mb-6 md:mb-10">
                <h1 className={`text-3xl md:text-5xl font-bold mb-2 drop-shadow-sm ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{t('profile.title')}</h1>
                <p className={`text-sm font-bold uppercase tracking-widest ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                    Your journey in {targetLang.name} · progress is saved per language
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