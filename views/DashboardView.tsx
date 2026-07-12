import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { DailyQuestsCard } from '../components/common/DailyQuestsCard';
import { generateMistakeReviewQuiz } from '../services/geminiService';

interface MenuCardProps {
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
    isBusy?: boolean;
    variant?: 'primary' | 'secondary';
}

const MenuCard: React.FC<MenuCardProps> = ({ title, description, icon, onClick, disabled = false, isBusy = false, variant = 'primary' }) => {
    const { isHighContrast } = useAppContext();

    // Determine base background based on high contrast mode
    const bgClass = isHighContrast
        ? 'bg-night-card border-slate-700 hover:border-brand-turquoise'
        : (variant === 'primary' ? 'bg-white/80 border-gold' : 'bg-desert/80 border-gold');

    return (
        <button
            onClick={onClick}
            disabled={disabled || isBusy}
            className={`
                group relative rounded-2xl border-2 shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise hover:z-10
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-xl'}
                ${bgClass} backdrop-blur-sm
                flex flex-col items-center justify-center text-center p-4 h-full
                md:flex-row md:text-left md:justify-start md:p-4
            `}
        >
            {/* Icon Container */}
            <div className={`
                flex items-center justify-center rounded-full shadow-inner border-2 transition-colors group-hover:bg-brand-turquoise
                w-12 h-12 text-2xl mb-2
                md:w-14 md:h-14 md:text-3xl md:mb-0 md:mr-4 md:shrink-0
                ${isHighContrast
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-dark-green border-desert text-white'}
            `}>
                {isBusy ? <span className="animate-spin">⏳</span> : icon}
            </div>

            {/* Text Container */}
            <div className="flex-grow min-w-0">
                <h3 className={`text-sm font-bold leading-tight group-hover:text-brand-turquoise transition-colors md:text-lg md:mb-1
                    ${isHighContrast ? 'text-white' : 'text-dark-green'}
                `}>
                    {title}
                </h3>
                {/* Description - Hidden on mobile, visible on desktop */}
                <p className={`hidden md:block text-xs leading-relaxed font-medium line-clamp-2
                    ${isHighContrast ? 'text-slate-400' : 'text-dark-green/80'}
                `}>
                    {description}
                </p>
            </div>

            {/* Arrow - Hidden on mobile, visible on desktop */}
            <div className={`hidden md:block text-xl opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 ml-2
                ${isHighContrast ? 'text-brand-turquoise' : 'text-gold'}
            `}>
                ➜
            </div>
        </button>
    );
};

// Invitation to calibrate the starting level — shown per language, so
// starting a new language offers a fresh placement test.
const PlacementBanner: React.FC = () => {
    const { profile, setView, isHighContrast, targetLang } = useAppContext();
    const dismissKey = `placementDismissed-${targetLang.code}`;
    const [dismissed, setDismissed] = useState<boolean>(() => {
        try { return localStorage.getItem(dismissKey) === 'true'; } catch { return false; }
    });

    const isFreshLanguage = profile.xp === 0
        && profile.quizzesCompleted === 0
        && !profile.placementDone;

    if (!isFreshLanguage || dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(dismissKey, 'true'); } catch { /* ignore */ }
    };

    return (
        <div className={`relative flex flex-col sm:flex-row items-center gap-3 rounded-2xl border-2 p-4 mb-3 shadow-lg animate-fade-in
            ${isHighContrast
                ? 'bg-gradient-to-r from-teal-900/80 to-slate-800/80 border-brand-turquoise/50'
                : 'bg-gradient-to-r from-brand-turquoise/20 to-gold/20 border-brand-turquoise/40 backdrop-blur-sm'}
        `}>
            <span className="text-3xl shrink-0">🎯</span>
            <div className="flex-grow text-center sm:text-left">
                <p className={`font-bold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    New here? Find your level.
                </p>
                <p className={`text-sm ${isHighContrast ? 'text-slate-300' : 'text-dark-green/70'}`}>
                    A 10-question placement test sets your starting point — no more too-easy lessons.
                </p>
            </div>
            <button
                onClick={() => setView('placement')}
                className="shrink-0 px-4 py-2 rounded-lg font-bold bg-brand-turquoise text-white shadow hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
                Start test
            </button>
            <button
                onClick={dismiss}
                title="Dismiss"
                className={`absolute top-2 right-2 sm:static sm:ml-1 p-1.5 rounded-full text-sm transition-colors
                    ${isHighContrast ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-dark-green/50 hover:text-dark-green hover:bg-black/5'}
                `}
            >
                ✕
            </button>
        </div>
    );
};

export const DashboardView = () => {
    const {
        setView, isHighContrast, profile,
        sourceLang, targetLang, setCustomQuiz, setError,
    } = useAppContext();
    const { t } = useLocalization();
    const [isBuildingReview, setIsBuildingReview] = useState(false);

    const mistakeCount = profile.mistakes?.length ?? 0;

    const openQuiz = () => {
        setCustomQuiz(null); // never serve a stale topic/review quiz here
        setView('quiz');
    };

    const openMistakeReview = async () => {
        if (isBuildingReview || mistakeCount === 0) return;
        setIsBuildingReview(true);
        try {
            const quiz = await generateMistakeReviewQuiz(profile.mistakes, sourceLang, targetLang);
            setCustomQuiz(quiz);
            setView('quiz');
        } catch (error) {
            console.error('Failed to build mistake review:', error);
            setError('Could not build your review quiz. Please try again.');
        } finally {
            setIsBuildingReview(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-4 py-2 md:py-4 animate-fade-in">
            {/* Header */}
            <div className="shrink-0 flex justify-between items-center mb-2 md:mb-4">
                <h1 className={`text-2xl md:text-3xl font-bold drop-shadow-sm ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    {t('dashboard.title')}
                </h1>
                <button
                    onClick={() => setView('home')}
                    className={`text-xs md:text-sm underline font-bold hover:text-brand-turquoise
                        ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}
                    `}
                >
                    {t('dashboard.changeLanguage')}
                </button>
            </div>

            <PlacementBanner />

            {/* Main Grid Layout */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 overflow-y-auto p-2 pb-20 md:pb-2">

                {/* Left Column: Daily Quests (Desktop: 4 cols, Mobile: Full width) */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col">
                    <DailyQuestsCard />

                    {/* Profile Summary Card (Optional, could be added here later) */}
                    <div className={`hidden md:flex backdrop-blur-sm p-3 rounded-2xl border mt-3 flex-grow items-center justify-center text-center
                        ${isHighContrast
                            ? 'bg-night-card/60 border-slate-700'
                            : 'bg-white/60 border-white/50'}
                    `}>
                        <p className={`italic text-xs ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                            "Every day is a new adventure."
                        </p>
                    </div>
                </div>

                {/* Right Column: Menu Grid (Desktop: 8 cols, Mobile: Full width grid) */}
                <div className="md:col-span-8 lg:col-span-9 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4 content-start">
                    <MenuCard
                        title={t('dashboard.quiz.title')}
                        description={t('dashboard.quiz.desc')}
                        icon="🧠"
                        onClick={openQuiz}
                    />

                    <MenuCard
                        title={t('dashboard.lightning.title')}
                        description={t('dashboard.lightning.desc')}
                        icon="⚡️"
                        onClick={() => setView('lightning')}
                    />

                    <MenuCard
                        title={t('dashboard.chat.title')}
                        description={t('dashboard.chat.desc')}
                        icon="💬"
                        onClick={() => setView('chat')}
                    />

                    <MenuCard
                        title="Training Grounds"
                        description="Master the basics with structured lessons."
                        icon="⚔️"
                        onClick={() => setView('training')}
                    />

                    <MenuCard
                        title="Saga Map"
                        description="Embark on your journey along the Silk Road."
                        icon="🗺️"
                        onClick={() => setView('sagaMap')}
                    />

                    <MenuCard
                        title="Review Mistakes"
                        description={mistakeCount > 0
                            ? `Turn your ${mistakeCount} logged mistake${mistakeCount === 1 ? '' : 's'} into a personalized quiz.`
                            : 'Chat with your tutor first — your corrected mistakes appear here.'}
                        icon="🩹"
                        onClick={openMistakeReview}
                        disabled={mistakeCount === 0}
                        isBusy={isBuildingReview}
                    />

                    <MenuCard
                        title={t('dashboard.profile.title')}
                        description={t('dashboard.profile.desc')}
                        icon="👤"
                        onClick={() => setView('profile')}
                    />
                </div>
            </div>
        </div>
    );
};
