import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { DailyQuestsCard } from '../components/common/DailyQuestsCard';
import { Button } from '../components/common/Button';
import { Chip } from '../components/common/Card';
import { JourneyLine } from '../components/common/JourneyLine';
import { generateMistakeReviewQuiz } from '../services/geminiService';
import { flagOf } from '../constants/languages';
import { INTEREST_OPTIONS } from '../constants/interests';
import { XP_PER_LEVEL } from '../constants/achievements';
import { CEFR_LABELS } from '../utils/placement';
import {
    Brain, Zap, MessagesSquare, Swords, Map as MapIcon, Bandage, User,
    Languages, ArrowRight, Loader2, Compass, Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MenuCardProps {
    title: string;
    description: string;
    Icon: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
    isBusy?: boolean;
}

const MenuCard: React.FC<MenuCardProps> = ({ title, description, Icon, onClick, disabled = false, isBusy = false }) => {
    const { isHighContrast } = useAppContext();

    const bgClass = isHighContrast
        ? 'bg-night-card border-slate-700 hover:border-brand-turquoise'
        : 'bg-white/80 border-desert-dark hover:border-brand-turquoise';

    return (
        <button
            onClick={onClick}
            disabled={disabled || isBusy}
            className={`
                group relative rounded-2xl border-2 shadow-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise hover:z-10
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-lg'}
                ${bgClass} backdrop-blur-sm
                flex flex-col items-center justify-center text-center p-4 h-full
                md:flex-row md:text-left md:justify-start md:p-4
            `}
        >
            {/* Icon Container */}
            <div className={`
                flex items-center justify-center rounded-full shadow-inner border-2 transition-colors group-hover:bg-brand-turquoise group-hover:border-brand-turquoise
                w-12 h-12 mb-2
                md:w-14 md:h-14 md:mb-0 md:mr-4 md:shrink-0
                ${isHighContrast
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-dark-green border-desert text-white'}
            `}>
                {isBusy
                    ? <Loader2 className="w-6 h-6 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    : <Icon className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" />}
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
            <ArrowRight
                className="hidden md:block w-5 h-5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 ml-2 text-brand-turquoise shrink-0"
                strokeWidth={2}
                aria-hidden="true"
            />
        </button>
    );
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DashboardView = () => {
    const {
        setView, isHighContrast, profile,
        sourceLang, targetLang, setCustomQuiz, setError,
    } = useAppContext();
    const { t } = useLocalization();
    const [isBuildingReview, setIsBuildingReview] = useState(false);

    const mistakeCount = profile.mistakes?.length ?? 0;
    const lp = profile.learnerProfile;

    const xpIntoLevel = Math.max(0, profile.xp - (profile.level - 1) * XP_PER_LEVEL);
    const xpProgress = Math.min(1, xpIntoLevel / XP_PER_LEVEL);

    const weakAreas = (lp?.weakAreas ?? []).slice(0, 3);
    const strongAreas = (lp?.strongAreas ?? []).slice(0, 2);
    const interests = (lp?.interests ?? [])
        .map(id => INTEREST_OPTIONS.find(o => o.id === id))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .slice(0, 5);

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
            {/* Header — always says whose journey these numbers belong to */}
            <div className="shrink-0 flex justify-between items-center mb-2 md:mb-3 gap-3">
                <div className="min-w-0">
                    <h1 className={`text-2xl md:text-3xl font-bold drop-shadow-sm truncate ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                        {flagOf(targetLang.code)} Learning {targetLang.name}
                    </h1>
                </div>
                <button
                    onClick={() => setView('languages')}
                    className={`shrink-0 flex items-center gap-1.5 text-xs md:text-sm underline font-bold hover:text-brand-turquoise
                        ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}
                    `}
                >
                    <Languages className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> My Languages
                </button>
            </div>

            {/* Journey hero — the learner profile made visible: where you are,
                what to work on, and one obvious way to continue. */}
            <div className={`shrink-0 relative rounded-2xl border-2 p-4 md:p-5 mb-3 shadow-lg backdrop-blur-sm animate-fade-in overflow-hidden
                ${isHighContrast
                    ? 'bg-night-card border-slate-700'
                    : 'bg-white/85 border-desert-dark'}
            `}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h2 className={`text-lg md:text-xl font-extrabold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                                Continue your journey
                            </h2>
                            {lp?.cefr && (
                                <Chip variant="earned">{lp.cefr} · {CEFR_LABELS[lp.cefr]}</Chip>
                            )}
                            <Chip variant="earned">LVL {profile.level}</Chip>
                        </div>

                        <JourneyLine progress={xpProgress} className="max-w-md" />
                        <p className={`text-xs font-bold mt-1 tabular-nums ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                            {xpIntoLevel} / {XP_PER_LEVEL} XP to level {profile.level + 1}
                        </p>

                        {(weakAreas.length > 0 || strongAreas.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {weakAreas.length > 0 && (
                                    <span className={`text-xs font-bold uppercase tracking-wide mr-0.5 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                                        Focus
                                    </span>
                                )}
                                {weakAreas.map(area => (
                                    <Chip key={area} variant="act">{titleCase(area)}</Chip>
                                ))}
                                {strongAreas.length > 0 && (
                                    <span className={`text-xs font-bold uppercase tracking-wide ml-2 mr-0.5 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                                        Strong
                                    </span>
                                )}
                                {strongAreas.map(area => (
                                    <Chip key={area} variant="earned">{titleCase(area)}</Chip>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                        {profile.placementDone || lp ? (
                            <>
                                <Button onClick={() => setView('sagaMap')} className="flex items-center justify-center gap-2 whitespace-nowrap">
                                    <Compass className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" /> Continue the saga
                                </Button>
                                <Button onClick={openQuiz} variant="secondary" className="flex items-center justify-center gap-2 whitespace-nowrap">
                                    <Target className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" /> Adaptive quiz
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setView('placement')} className="flex items-center justify-center gap-2 whitespace-nowrap">
                                    <Target className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" /> Find your level
                                </Button>
                                <Button onClick={() => setView('sagaMap')} variant="secondary" className="flex items-center justify-center gap-2 whitespace-nowrap">
                                    <Compass className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" /> Explore anyway
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 overflow-y-auto p-2 pb-20 md:pb-2">

                {/* Left Column: Daily Quests (Desktop: 4 cols, Mobile: Full width) */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col">
                    <DailyQuestsCard />

                    {/* Your topics — the interests every AI generation leans on */}
                    <div className={`hidden md:flex backdrop-blur-sm p-3 rounded-2xl border mt-3 flex-grow flex-col items-center justify-center text-center gap-2
                        ${isHighContrast
                            ? 'bg-night-card/60 border-slate-700'
                            : 'bg-white/60 border-white/50'}
                    `}>
                        {interests.length > 0 ? (
                            <>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                                    Your lessons lean on
                                </p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {interests.map(o => (
                                        <Chip key={o.id} variant="neutral">{o.emoji} {o.label}</Chip>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className={`italic text-xs ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>
                                "Every day is a new adventure."
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column: Menu Grid (Desktop: 8 cols, Mobile: Full width grid) */}
                <div className="md:col-span-8 lg:col-span-9 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4 content-start">
                    <MenuCard
                        title={t('dashboard.quiz.title')}
                        description={t('dashboard.quiz.desc')}
                        Icon={Brain}
                        onClick={openQuiz}
                    />

                    <MenuCard
                        title={t('dashboard.lightning.title')}
                        description={t('dashboard.lightning.desc')}
                        Icon={Zap}
                        onClick={() => setView('lightning')}
                    />

                    <MenuCard
                        title={t('dashboard.chat.title')}
                        description={t('dashboard.chat.desc')}
                        Icon={MessagesSquare}
                        onClick={() => setView('chat')}
                    />

                    <MenuCard
                        title="Training Grounds"
                        description="Master the basics with structured lessons."
                        Icon={Swords}
                        onClick={() => setView('training')}
                    />

                    <MenuCard
                        title="Saga Map"
                        description="Embark on your journey along the Silk Road."
                        Icon={MapIcon}
                        onClick={() => setView('sagaMap')}
                    />

                    <MenuCard
                        title="Review Mistakes"
                        description={mistakeCount > 0
                            ? `Turn your ${mistakeCount} logged mistake${mistakeCount === 1 ? '' : 's'} into a personalized quiz.`
                            : 'Chat with your tutor first — your corrected mistakes appear here.'}
                        Icon={Bandage}
                        onClick={openMistakeReview}
                        disabled={mistakeCount === 0}
                        isBusy={isBuildingReview}
                    />

                    <MenuCard
                        title={t('dashboard.profile.title')}
                        description={t('dashboard.profile.desc')}
                        Icon={User}
                        onClick={() => setView('profile')}
                    />
                </div>
            </div>
        </div>
    );
};
