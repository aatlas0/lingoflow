
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { generateQuiz } from '../services/geminiService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '../components/common/Button';
import { SpeakerIcon } from '../components/common/SpeakerIcon';
import type { QuizQuestion, UserAnswer, QuizText, DarijaText } from '../types';
import { XP_GAINS } from '../constants/achievements';
import { triggerWinConfetti } from '../utils/confetti';

const isDarijaText = (text: QuizText): text is DarijaText => {
    return text !== null && typeof text === 'object' && 'arabic' in text;
};

const getText = (text: QuizText): string => {
    return isDarijaText(text) ? `${text.arabic} (${text.latin})` : text;
};

const getSpeakableText = (text: QuizText): string => {
    return isDarijaText(text) ? text.arabic : text;
}

const areTextsEqual = (a: QuizText, b: QuizText): boolean => {
    if (isDarijaText(a) && isDarijaText(b)) {
        return a.latin === b.latin;
    }
    if (typeof a === 'string' && typeof b === 'string') {
        return a === b;
    }
    return false;
}

const QuizOption: React.FC<{
    option: QuizText;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ option, isSelected, onSelect }) => {
    const baseClasses = "w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center relative overflow-hidden cursor-pointer h-full";

    let stateClasses = 'bg-white/95 border-dark-green/20 hover:border-brand-turquoise hover:shadow-lg text-dark-green';

    if (isSelected) {
        stateClasses = 'bg-brand-turquoise text-white border-brand-turquoise shadow-xl scale-[1.02]';
    }

    return (
        <button onClick={onSelect} className={`${baseClasses} ${stateClasses}`}>
            <span className="font-semibold z-10 relative pr-8 text-sm md:text-base leading-relaxed">{getText(option)}</span>
            <div className="z-10 absolute right-2 top-1/2 transform -translate-y-1/2 scale-75"><SpeakerIcon textToSpeak={getSpeakableText(option)} /></div>
        </button>
    );
};

export const QuizView = () => {
    const {
        sourceLang,
        targetLang,
        addXp,
        unlockAchievement,
        setError,
        updateQuestProgress,
        triggerWinConfetti,
        customQuiz,
        setCustomQuiz,
        setView,
        isHighContrast,
        profile
    } = useAppContext();
    const { t } = useLocalization();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<QuizText | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [quizState, setQuizState] = useState<'playing' | 'reviewing'>('playing');
    const [isLoading, setIsLoading] = useState(true);

    // Ref to ensure results are processed only once per quiz
    const hasProcessedResults = useRef(false);

    const loadQuestions = async () => {
        setIsLoading(true);
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setUserAnswers([]);
        setQuizState('playing');
        setIsOverdriveActive(false); // Reset Overdrive
        hasProcessedResults.current = false;

        try {
            const quizData = customQuiz || await generateQuiz(sourceLang, targetLang, profile.level);
            setQuestions(quizData);
            // Do not clear customQuiz here to prevent loss on remount
        } catch (error) {
            console.error('Failed to load quiz:', error);
            setError(error instanceof Error ? error.message : 'Failed to load quiz');
        } finally {
            setIsLoading(false);
        }
    };

    const completeQuiz = () => {
        updateQuestProgress('quiz_complete', 1);
    };

    useEffect(() => {
        loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle Quiz Completion Side Effects
    useEffect(() => {
        if (quizState === 'reviewing' && !hasProcessedResults.current && userAnswers.length > 0) {
            hasProcessedResults.current = true;
            console.log('Processing quiz results...');

            // Calculate XP: Normal questions get standard XP, Overdrive questions get Double XP
            const totalXp = userAnswers.reduce((total, answer, index) => {
                if (!answer.isCorrect) return total;
                // Questions after index 4 (0-4 are first 5) are Overdrive
                const isOverdriveQuestion = index >= 5;
                return total + (isOverdriveQuestion ? XP_GAINS.QUIZ_CORRECT * 2 : XP_GAINS.QUIZ_CORRECT);
            }, 0);

            // Add XP
            addXp(totalXp);

            // Mark as complete with a slight delay to allow UI to settle
            setTimeout(() => {
                completeQuiz();

                // Trigger confetti for perfect score (adjusted for overdrive)
                const correctCount = userAnswers.filter(a => a.isCorrect).length;
                if (correctCount === questions.length) {
                    triggerWinConfetti();
                }
            }, 100);
        }
    }, [quizState, userAnswers, questions.length, addXp, updateQuestProgress, triggerWinConfetti]);

    // Overdrive State
    const [isOverdriveActive, setIsOverdriveActive] = useState(false);
    const [isOverdriveLoading, setIsOverdriveLoading] = useState(false);

    // Auto-advance effect
    useEffect(() => {
        if (!selectedAnswer || quizState !== 'playing' || isOverdriveLoading) return;

        const timer = setTimeout(async () => {
            const currentQuestion = questions[currentQuestionIndex];
            const isCorrect = areTextsEqual(selectedAnswer, currentQuestion.correctAnswer);

            // Use functional update to ensure we have the latest answers
            let newAnswers: UserAnswer[] = [];
            setUserAnswers(prev => {
                newAnswers = [...prev, { question: currentQuestion, selectedAnswer, isCorrect }];
                return newAnswers;
            });

            if (currentQuestionIndex < questions.length - 1) {
                // Move to next question
                setSelectedAnswer(null);
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                // Check for Overdrive Trigger (Perfect Score on first 5 questions)
                const correctCount = newAnswers.filter(a => a.isCorrect).length;
                if (!isOverdriveActive && correctCount === 5 && questions.length === 5) {
                    console.log('OVERDRIVE ACTIVATED!');
                    setIsOverdriveLoading(true);
                    try {
                        const { generateOverdriveQuestions } = await import('../services/geminiService');
                        const overdriveQuestions = await generateOverdriveQuestions(sourceLang, targetLang);

                        setQuestions(prev => [...prev, ...overdriveQuestions]);
                        setIsOverdriveActive(true);
                        setSelectedAnswer(null);
                        setCurrentQuestionIndex(prev => prev + 1);
                        // Ideally show a flash message here
                        alert("⚡ OVERDRIVE ACTIVATED! +2 BONUS QUESTIONS! ⚡");
                    } catch (err) {
                        console.error("Failed to load overdrive:", err);
                        setQuizState('reviewing');
                    } finally {
                        setIsOverdriveLoading(false);
                    }
                } else {
                    // Finish quiz
                    console.log('Quiz completed! Switching to review view...');
                    setQuizState('reviewing');
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [selectedAnswer, currentQuestionIndex, questions, quizState, isOverdriveLoading, isOverdriveActive, sourceLang, targetLang]);

    const handleSelectAnswer = (option: QuizText) => {
        if (selectedAnswer) return; // Prevent changing answer while waiting
        setSelectedAnswer(option);
    };

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-full text-dark-green"><LoadingSpinner size="lg" /><p className="mt-4 text-lg font-medium">{t('quiz.loading')}</p></div>;
    }

    if (questions.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full"><p className="text-xl text-deep-red mb-4">{t('quiz.error')}</p><Button onClick={loadQuestions}>{t('quiz.tryAgain')}</Button></div>;
    }

    if (quizState === 'reviewing') {
        const score = userAnswers.filter(a => a.isCorrect).length;
        return (
            <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 overflow-hidden animate-fade-in">
                {/* Left Column: Score & Actions */}
                <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col justify-center shrink-0">
                    <div className={`
                        p-6 md:p-8 rounded-3xl shadow-2xl border-2 text-center transition-all duration-500
                        ${isHighContrast
                            ? 'bg-night-card border-slate-700'
                            : 'bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border-gold/30'}
                    `}>
                        <h1 className={`text-3xl md:text-4xl font-extrabold mb-6 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                            Quiz Complete! 🎉
                        </h1>

                        {/* Score Display */}
                        <div className="mb-6">
                            <div className="text-6xl md:text-7xl font-black text-gold mb-2 drop-shadow-lg">
                                {score} <span className={`text-4xl md:text-5xl ${isHighContrast ? 'text-slate-500' : 'text-dark-green/50'}`}>/</span> {questions.length}
                            </div>
                            <p className={`text-xl md:text-2xl font-semibold ${isHighContrast ? 'text-slate-300' : 'text-dark-green/80'}`}>
                                {score === questions.length ? '🏆 Perfect Score!' :
                                    score >= questions.length * 0.8 ? '⭐ Great Job!' :
                                        score >= questions.length * 0.6 ? '👍 Good Effort!' :
                                            '💪 Keep Practicing!'}
                            </p>
                        </div>

                        {/* Performance Summary */}
                        <div className="flex justify-center gap-6 mb-8 text-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">✅</span>
                                <span className="font-bold text-gold">{score} Correct</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">❌</span>
                                <span className="font-bold text-deep-red">{questions.length - score} Wrong</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={loadQuestions} className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                                🔄 Try Again
                            </Button>
                            <Button onClick={() => setView('dashboard')} variant="secondary" className="w-full py-4 text-lg font-bold border-2">
                                🏠 Dashboard
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Corrections */}
                <div className={`
                    w-full md:w-7/12 lg:w-2/3 flex flex-col h-full rounded-3xl border-2 overflow-hidden shadow-xl transition-all duration-500
                    ${isHighContrast
                        ? 'bg-night-card/80 border-slate-700 backdrop-blur-md'
                        : 'bg-white/40 border-white/50 backdrop-blur-md'}
                `}>
                    <div className={`
                        p-6 border-b shrink-0
                        ${isHighContrast ? 'bg-night-card border-slate-700' : 'bg-white/30 border-white/20'}
                    `}>
                        <h2 className={`text-2xl font-bold flex items-center gap-3 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                            <span>📝</span> Detailed Review
                        </h2>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-4">
                        {userAnswers.map((answer, index) => (
                            <div key={index} className={`
                                p-5 rounded-2xl border-l-[6px] shadow-sm hover:shadow-md transition-all duration-300
                                ${isHighContrast ? 'bg-slate-800' : 'bg-white/80'}
                                ${answer.isCorrect ? 'border-gold' : 'border-deep-red'}
                            `}>
                                <div className="flex justify-between items-start mb-3">
                                    <p className={`font-bold text-lg flex gap-2 ${isHighContrast ? 'text-slate-200' : 'text-dark-green'}`}>
                                        <span className="text-brand-turquoise opacity-70">#{index + 1}</span>
                                        {getText(answer.question.question)}
                                    </p>
                                    {answer.isCorrect ? <span className="text-2xl shrink-0">✅</span> : <span className="text-2xl shrink-0">❌</span>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <div className={`p-3 rounded-xl border ${isHighContrast ? 'bg-slate-900 border-slate-700' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <p className={`text-xs font-bold uppercase mb-1.5 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>Your Answer</p>
                                        <p className={`text-base font-semibold ${!answer.isCorrect ? 'text-deep-red' : 'text-gold'}`}>{getText(answer.selectedAnswer)}</p>
                                    </div>
                                    {!answer.isCorrect && (
                                        <div className={`p-3 rounded-xl border ${isHighContrast ? 'bg-slate-900 border-slate-700' : 'bg-gray-50/80 border-gray-100'}`}>
                                            <p className={`text-xs font-bold uppercase mb-1.5 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>Correct Answer</p>
                                            <p className="text-brand-turquoise font-semibold text-base">{getText(answer.question.correctAnswer)}</p>
                                        </div>
                                    )}
                                </div>

                                {answer.question.explanation && (
                                    <div className={`p-3 rounded-xl border flex gap-3 ${isHighContrast ? 'bg-yellow-900/20 border-yellow-700/30 text-slate-300' : 'bg-gold/5 border-gold/10 text-dark-green'}`}>
                                        <span className="text-lg shrink-0">💡</span>
                                        <p className="text-sm leading-relaxed opacity-90">{answer.question.explanation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    if (!currentQuestion) {
        return <div className="flex flex-col items-center justify-center h-full text-dark-green"><LoadingSpinner size="lg" /></div>;
    }

    return (
        <div className="w-full h-full max-w-4xl mx-auto p-4 flex flex-col">
            {/* Header / Progress */}
            <div className="shrink-0 flex justify-between items-center mb-6">
                <div className="flex items-center gap-4 flex-1">
                    <Button onClick={() => setView('dashboard')} variant="ghost" className="text-dark-green hover:text-brand-turquoise">
                        ❌
                    </Button>
                    <div className="h-3 bg-gray-200 rounded-full flex-1 overflow-hidden">
                        <div
                            className="h-full bg-brand-turquoise transition-all duration-500 ease-out"
                            style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                        ></div>
                    </div>
                    <span className="text-sm font-bold text-dark-green whitespace-nowrap">
                        {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <span className="text-xs font-black bg-amber-400 text-white px-2 py-1 rounded-full shadow-sm ml-2">
                        LVL {profile.level}
                    </span>
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-grow flex flex-col justify-center items-center mb-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-dark-green mb-6 leading-tight">
                        {getText(currentQuestion.question)}
                    </h2>
                    <div className="transform scale-125 inline-block">
                        <SpeakerIcon textToSpeak={getSpeakableText(currentQuestion.question)} />
                    </div>
                </div>

                {/* Options Grid */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {currentQuestion.options.map((option, index) => (
                        <QuizOption
                            key={index}
                            option={option}
                            isSelected={selectedAnswer ? areTextsEqual(selectedAnswer, option) : false}
                            onSelect={() => handleSelectAnswer(option)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};