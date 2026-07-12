import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { generatePlacementQuiz } from '../services/geminiService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '../components/common/Button';
import { XP_PER_LEVEL } from '../constants/achievements';
import type { QuizQuestion, QuizText, DarijaText } from '../types';

const isDarijaText = (text: QuizText): text is DarijaText =>
    text !== null && typeof text === 'object' && 'arabic' in text;

const getText = (text: QuizText): string =>
    isDarijaText(text) ? `${text.arabic} (${text.latin})` : text;

const areTextsEqual = (a: QuizText, b: QuizText): boolean => {
    if (isDarijaText(a) && isDarijaText(b)) return a.latin === b.latin;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    return false;
};

// Score (out of 10) → starting level. Cap at 5 so advanced learners still
// have headroom and generated content stays reasonable.
const scoreToLevel = (score: number): number => {
    if (score <= 2) return 1;
    if (score <= 4) return 2;
    if (score <= 6) return 3;
    if (score <= 8) return 4;
    return 5;
};

const LEVEL_BLURBS: Record<number, string> = {
    1: "Fresh start — we'll begin with the very basics and build up fast.",
    2: 'Elementary — you already know your way around simple phrases.',
    3: "Intermediate — everyday conversations won't scare you.",
    4: 'Upper intermediate — impressive command of the language!',
    5: "Advanced — we'll keep the challenges coming.",
};

type Phase = 'loading' | 'playing' | 'done' | 'error';

export const PlacementView: React.FC = () => {
    const { sourceLang, targetLang, updateProfile, unlockAchievement, setView, isHighContrast } = useAppContext();
    const [phase, setPhase] = useState<Phase>('loading');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<QuizText | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [resultLevel, setResultLevel] = useState(1);

    const loadTest = async () => {
        setPhase('loading');
        setQuestions([]);
        setCurrentIndex(0);
        setSelected(null);
        setCorrectCount(0);
        try {
            const qs = await generatePlacementQuiz(sourceLang, targetLang);
            if (!qs || qs.length === 0) throw new Error('empty placement quiz');
            setQuestions(qs);
            setPhase('playing');
        } catch (error) {
            console.error('Failed to generate placement test:', error);
            setPhase('error');
        }
    };

    useEffect(() => {
        loadTest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const finish = (finalCorrect: number) => {
        const level = scoreToLevel(finalCorrect);
        setResultLevel(level);
        updateProfile({ level, xp: (level - 1) * XP_PER_LEVEL, placementDone: true });
        unlockAchievement('placement_complete');
        setPhase('done');
    };

    const handleSelect = (option: QuizText) => {
        if (selected) return; // ignore double clicks while advancing
        setSelected(option);

        const isCorrect = areTextsEqual(option, questions[currentIndex].correctAnswer);
        const nextCorrect = correctCount + (isCorrect ? 1 : 0);
        setCorrectCount(nextCorrect);

        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setSelected(null);
                setCurrentIndex(i => i + 1);
            } else {
                finish(nextCorrect);
            }
        }, 400);
    };

    const skip = () => {
        try { localStorage.setItem(`placementDismissed-${targetLang.code}`, 'true'); } catch { /* ignore */ }
        setView('dashboard');
    };

    const cardClasses = isHighContrast
        ? 'bg-night-card/90 border-slate-700'
        : 'bg-white/80 border-white/60';
    const titleColor = isHighContrast ? 'text-white' : 'text-dark-green';
    const subColor = isHighContrast ? 'text-slate-300' : 'text-dark-green/70';

    if (phase === 'loading') {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${titleColor}`}>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-lg font-medium animate-pulse">Preparing your placement test…</p>
                <p className={`mt-1 text-sm ${subColor}`}>10 questions, easiest to hardest.</p>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-xl text-deep-red">Couldn't load the placement test.</p>
                <div className="flex gap-3">
                    <Button onClick={loadTest}>Try Again</Button>
                    <Button onClick={skip} variant="secondary">Skip for now</Button>
                </div>
            </div>
        );
    }

    if (phase === 'done') {
        return (
            <div className="flex items-center justify-center h-full p-4 animate-fade-in">
                <div className={`backdrop-blur-md rounded-3xl shadow-2xl border-2 p-8 md:p-10 max-w-lg w-full text-center ${cardClasses}`}>
                    <div className="text-6xl mb-4">🎯</div>
                    <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 ${titleColor}`}>
                        You start at Level {resultLevel}!
                    </h1>
                    <p className={`text-lg mb-1 font-semibold ${subColor}`}>
                        {correctCount} / {questions.length} correct
                    </p>
                    <p className={`mb-8 ${subColor}`}>{LEVEL_BLURBS[resultLevel]}</p>
                    <Button onClick={() => setView('dashboard')} className="w-full py-4 text-lg font-bold">
                        Start Learning →
                    </Button>
                </div>
            </div>
        );
    }

    const question = questions[currentIndex];

    return (
        <div className="w-full h-full max-w-3xl mx-auto p-4 flex flex-col">
            {/* Progress */}
            <div className="shrink-0 flex items-center gap-4 mb-8 mt-2">
                <button
                    onClick={skip}
                    className={`text-sm font-bold underline whitespace-nowrap hover:text-brand-turquoise ${subColor}`}
                >
                    Skip test
                </button>
                <div className={`h-3 rounded-full flex-1 overflow-hidden ${isHighContrast ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                        className="h-full bg-brand-turquoise transition-all duration-500 ease-out"
                        style={{ width: `${(currentIndex / questions.length) * 100}%` }}
                    ></div>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${titleColor}`}>
                    {currentIndex + 1} / {questions.length}
                </span>
            </div>

            {/* Question */}
            <div className="flex-grow flex flex-col justify-center items-center pb-10">
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${subColor}`}>
                    Placement · difficulty rises as you go
                </p>
                <h2 className={`text-2xl md:text-4xl font-extrabold mb-10 leading-tight text-center ${titleColor}`}>
                    {getText(question.question)}
                </h2>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {question.options.map((option, index) => {
                        const isSelected = selected ? areTextsEqual(selected, option) : false;
                        return (
                            <button
                                key={index}
                                onClick={() => handleSelect(option)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 font-semibold
                                    ${isSelected
                                        ? 'bg-brand-turquoise text-white border-brand-turquoise shadow-xl scale-[1.02]'
                                        : isHighContrast
                                            ? 'bg-slate-800 border-slate-600 text-white hover:border-brand-turquoise'
                                            : 'bg-white/95 border-dark-green/20 text-dark-green hover:border-brand-turquoise hover:shadow-lg'}
                                `}
                            >
                                {getText(option)}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
