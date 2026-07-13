import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import type { SkillTree, TrainingCategory, SubLesson } from '../types';
import { generateSkillTree, generateSubLessons, generateQuizFromTopics } from '../services/geminiService';
import { readAiCache, writeAiCache } from '../utils/aiCache';
import { GlassCard } from '../components/common/GlassCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const TrainingGroundsView: React.FC = () => {
    const {
        sourceLang, targetLang, profile, isHighContrast,
        setView, setError, setCurrentSubLesson, setCustomQuiz,
        skillTree, setSkillTree, isHydrating
    } = useAppContext();

    const { t } = useLocalization();
    const [categories, setCategories] = useState<TrainingCategory[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const isLoading = isHydrating || isGenerating;

    // The skill tree lives in AppContext (synced to the account, per target
    // language). Only generate one when the account has none yet.
    useEffect(() => {
        if (isHydrating || skillTree) return;
        let cancelled = false;
        (async () => {
            setIsGenerating(true);
            try {
                const tree = await generateSkillTree(sourceLang, targetLang, profile.level, profile.learnerProfile);
                if (!cancelled) setSkillTree(tree);
            } catch (error) {
                console.error('Failed to load training data:', error);
                if (!cancelled) setError('Failed to load Training Grounds');
            } finally {
                if (!cancelled) setIsGenerating(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrating, skillTree, sourceLang, targetLang, profile.level]);

    // Organize the tree into training categories whenever it changes
    useEffect(() => {
        if (!skillTree) {
            setCategories([]);
            return;
        }
        const cats: TrainingCategory[] = skillTree.skill_tree.map((branch, index) => {
            const icon = getCategoryIcon(branch.branch);
            const completedCount = branch.nodes.filter(n =>
                n.state === 'inked' || n.state === 'anchored'
            ).length;
            const progress = (completedCount / branch.nodes.length) * 100;

            // First category is always unlocked (in_progress) if not mastered
            const status = progress === 100 ? 'mastered' :
                (progress > 0 || index === 0) ? 'in_progress' : 'locked';

            return {
                id: branch.branch,
                name: branch.branch,
                icon,
                description: `Master ${branch.branch.toLowerCase()} skills`,
                progress,
                subLessons: [], // Will be loaded when category is selected
                status
            };
        });
        setCategories(cats);
    }, [skillTree]);

    const getCategoryIcon = (branchName: string): string => {
        const icons: Record<string, string> = {
            'Vocabulary': '📚',
            'Grammar': '⚡',
            'Conversation': '🗣️',
            'Culture': '🌍',
            'Pronunciation': '🎙️',
        };
        return icons[branchName] || '✨';
    };

    const handleCategoryClick = async (category: TrainingCategory) => {
        if (category.status === 'locked') return;

        // Load sub-lessons for this category if not already loaded
        if (category.subLessons.length === 0 && skillTree) {
            try {
                const branch = skillTree.skill_tree.find(b => b.branch === category.name);

                if (!branch) {
                    console.error(`Branch not found for category: ${category.name}`);
                    setError(`Data mismatch: Category ${category.name} not found`);
                    return;
                }

                if (!branch.nodes || branch.nodes.length === 0) {
                    console.error(`No nodes found in branch: ${category.name}`);
                    setError(`No content available for ${category.name}`);
                    return;
                }

                // Use the first node as representative for now
                const representativeNode = branch.nodes[0];

                // Sub-lessons are expensive to generate — cache per branch so
                // reopening a category (or the whole view) reuses them. The
                // node name in the key invalidates when the tree regenerates.
                const cacheKey = `subLessons-${targetLang.code}-${category.name}-${representativeNode.node_name}`;
                let subLessons = readAiCache<SubLesson[]>(cacheKey);

                if (!subLessons || subLessons.length === 0) {
                    console.log(`Generating sub-lessons for ${category.name} using node: ${representativeNode.node_name}`);
                    subLessons = await generateSubLessons(
                        representativeNode,
                        sourceLang,
                        targetLang,
                        profile.learnerProfile
                    );

                    if (!subLessons || subLessons.length === 0) {
                        throw new Error("Received empty sub-lessons from AI service");
                    }
                    writeAiCache(cacheKey, subLessons);
                }

                // Update category with sub-lessons
                setCategories(prev => prev.map(cat =>
                    cat.id === category.id
                        ? { ...cat, subLessons }
                        : cat
                ));
            } catch (error) {
                console.error('Failed to load sub-lessons:', error);
                setError('Failed to load lessons. Please try again.');
            }
        }
    };

    const handleSubLessonClick = (subLesson: SubLesson) => {
        if (subLesson.status === 'locked') return;

        // Set current sub-lesson and navigate to quiz
        setCurrentSubLesson(subLesson);
        setView('practiceQuiz');
    };

    const handleContextualQuiz = async (subLesson: SubLesson) => {
        // We rely on the UI to only trigger this for unlocked lessons
        // subLesson.status might be stale (e.g. 'locked' even if unlocked via completion)

        setIsGenerating(true);
        try {
            console.log(`Generating contextual quiz for: ${subLesson.title}`);
            const quiz = await generateQuizFromTopics(subLesson.topics || [subLesson.title], sourceLang, targetLang);
            setCustomQuiz(quiz);
            setView('quiz');
        } catch (error) {
            console.error("Failed to generate contextual quiz:", error);
            setError("Failed to generate quiz. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#FDF6E3]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl animate-pulse">✨</span>
                    </div>
                </div>
                <p className="mt-4 text-lg font-medium text-slate-700 animate-pulse">
                    Loading Training Grounds...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#FFF8E1] overflow-y-auto relative perspective-1000 font-sans">
            {/* V5 Vivid Theme: Deeper Warm Beige with stronger pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: `radial-gradient(#D4C5A5 1.5px, transparent 1.5px), radial-gradient(#D4C5A5 1.5px, transparent 1.5px)`,
                    backgroundSize: '32px 32px',
                    backgroundPosition: '0 0, 16px 16px'
                }}>
            </div>

            {/* Vignette for depth */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,248,225,0)_60%,rgba(212,197,165,0.3)_100%)]"></div>

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                {/* Hero Section - Vivid Typography */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-4 drop-shadow-sm">
                        Training Grounds
                    </h1>
                    <p className="text-xl text-slate-700 max-w-2xl mx-auto font-bold tracking-wide opacity-80">
                        Master the basics with structured lessons.
                    </p>
                </div>

                {/* Masonry Grid - Spacing */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {categories.map((category, index) => (
                        <FlipCategoryCard
                            key={category.id}
                            category={category}
                            index={index}
                            onFlip={() => handleCategoryClick(category)}
                            onSubLessonClick={handleSubLessonClick}
                            onContextualQuiz={handleContextualQuiz}
                            completedSubLessons={profile.completedSubLessons || []}
                        />
                    ))}
                </div>
            </div>

            {/* Inject Styles for 3D Flip */}
            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
                /* Custom Scrollbar for Grid (Darker for light theme) */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(245, 158, 11, 0.4);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(245, 158, 11, 0.6);
                }
            `}</style>
        </div>
    );
};

// Flip Card Component
const FlipCategoryCard: React.FC<{
    category: TrainingCategory;
    index: number;
    onFlip: () => void;
    onSubLessonClick: (subLesson: SubLesson) => void;
    onContextualQuiz: (subLesson: SubLesson) => void;
    completedSubLessons: string[];
}> = ({ category, index, onFlip, onSubLessonClick, onContextualQuiz, completedSubLessons }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [hoveredLesson, setHoveredLesson] = useState<SubLesson | null>(null);
    const isLocked = category.status === 'locked';
    const isMastered = category.status === 'mastered';

    const isHoveredUnlocked = hoveredLesson && (
        hoveredLesson.order === 0 ||
        (completedSubLessons.includes(category.subLessons[hoveredLesson.order - 1]?.id))
    );

    const handleClick = () => {
        if (isLocked) return;
        setIsFlipped(!isFlipped);
        if (!isFlipped) {
            onFlip();
        }
    };

    return (
        <div
            className={`relative h-[420px] group cursor-pointer perspective-1000`}
            onClick={handleClick}
            onMouseLeave={() => setHoveredLesson(null)}
        >
            <div className={`
                w-full h-full transition-all duration-700 transform-style-3d
                ${isFlipped ? 'rotate-y-180' : ''}
            `}>
                {/* FRONT FACE */}
                <div className="absolute inset-0 backface-hidden">
                    <GlassCard
                        intensity="medium"
                        className={`
                            h-full p-8 flex flex-col justify-between
                            bg-white/95 backdrop-blur-xl border-amber-500/20 shadow-xl
                            ${isLocked ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.4)] hover:border-amber-500/50 hover:-translate-y-1'}
                            transition-all duration-500
                        `}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className={`
                                text-6xl p-5 rounded-3xl bg-slate-900 text-white shadow-2xl border-2 border-slate-800
                                transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6
                            `}>
                                {isLocked ? '🔒' : category.icon}
                            </div>
                            {isMastered && (
                                <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full shadow-lg animate-pulse uppercase border border-white/20">
                                    Mastered
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 mb-3 group-hover:text-amber-600 transition-colors tracking-tight">
                                {category.name}
                            </h3>
                            <p className="text-slate-600 text-base mb-8 line-clamp-2 font-medium leading-relaxed">
                                {category.description}
                            </p>

                            {/* Progress */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                                    <span>Progress</span>
                                    <span className="text-amber-600">{Math.round(category.progress)}%</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                                        style={{ width: `${category.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* BACK FACE (Grid of Dots) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <div className="h-full flex flex-col bg-slate-900 rounded-3xl border-2 border-amber-500/30 relative overflow-hidden shadow-2xl">

                        {/* Header Info Panel */}
                        <div className="h-[140px] bg-gradient-to-b from-slate-800 to-slate-900 p-5 flex flex-col justify-center relative overflow-hidden shrink-0 border-b border-amber-500/30">
                            {/* Ambient Glow */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-turquoise/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                            {hoveredLesson ? (
                                <div className="animate-[fadeIn_0.2s_ease-out] relative z-10">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-white font-bold text-lg tracking-tight leading-tight line-clamp-1 drop-shadow-md">
                                            {hoveredLesson.title}
                                        </h4>
                                        <span className="text-[10px] font-black text-slate-900 bg-amber-400 px-2 py-1 rounded shadow-[0_0_10px_rgba(251,191,36,0.4)] shrink-0 ml-2">
                                            {hoveredLesson.questionCount} Qs
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3 font-medium opacity-90">
                                        {hoveredLesson.description}
                                    </p>

                                    {/* Difficulty Dots */}
                                    <div className="flex items-center gap-1.5 relative z-50">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="relative flex items-center justify-center w-8 h-8">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (i === 0 && isHoveredUnlocked) {
                                                            onContextualQuiz(hoveredLesson);
                                                        }
                                                    }}
                                                    className={`
                                                        rounded-full transition-all duration-300 flex items-center justify-center
                                                        ${i === 0 ? 'w-6 h-6 cursor-pointer hover:scale-110 hover:bg-brand-turquoise hover:shadow-[0_0_15px_rgba(45,212,191,0.8)] ring-2 ring-transparent hover:ring-white/50' : 'w-2 h-2'}
                                                        
                                                        ${i < hoveredLesson.difficulty && i !== 0
                                                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110'
                                                            : i !== 0 ? 'bg-slate-700' : ''}
                                                        
                                                        /* First Dot Styling */
                                                        ${i === 0 && isHoveredUnlocked ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''}
                                                        ${i === 0 && !isHoveredUnlocked ? 'bg-slate-700 opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                    title={i === 0 ? (isHoveredUnlocked ? "Start Contextual Quiz" : "Locked") : undefined}
                                                >
                                                    {i === 0 && isHoveredUnlocked && (
                                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-0 hover:opacity-100 font-bold text-slate-900">▶</span>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                        <span className="text-[10px] text-amber-500/80 ml-2 uppercase tracking-wider font-bold">Difficulty</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse relative z-10">
                                    <span className="text-4xl mb-2 filter drop-shadow-lg">✨</span>
                                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500/50">Select a Lesson</span>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Grid Area */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900 relative">
                            {/* Subtle Grid Pattern */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none"
                                style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                            </div>

                            {category.subLessons.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 gap-3 pb-12 pt-4 px-1 relative z-10">
                                    {(category.subLessons || []).map((subLesson, i) => {
                                        const safeCompleted = completedSubLessons || [];
                                        const isCompleted = safeCompleted.includes(subLesson.id);
                                        const previousLesson = category.subLessons[i - 1];
                                        const isUnlocked = i === 0 || (previousLesson && safeCompleted.includes(previousLesson.id));

                                        return (
                                            <button
                                                key={subLesson.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isUnlocked) onSubLessonClick(subLesson);
                                                }}
                                                onMouseEnter={() => setHoveredLesson(subLesson)}
                                                className={`
                                                    aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all duration-300 relative group/btn
                                                    ${isCompleted
                                                        ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300/50 scale-100'
                                                        : isUnlocked
                                                            ? 'bg-slate-800 text-white border border-slate-600 hover:scale-110 hover:z-50 hover:bg-brand-turquoise hover:border-brand-turquoise hover:shadow-[0_0_20px_rgba(45,212,191,0.6)]'
                                                            : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                    }
                                                `}
                                            >
                                                {isCompleted ? '✓' : i + 1}
                                                {/* Shine effect for unlocked */}
                                                {isUnlocked && !isCompleted && (
                                                    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Flip Back Hint */}
                        <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pointer-events-none flex justify-center z-20">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-800/80 px-4 py-1.5 rounded-full backdrop-blur-md border border-slate-700 shadow-lg group-hover:border-amber-500/30 transition-colors">
                                Tap card to flip back
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
