import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import type { QuizQuestion, SubLesson, QuizText } from '../types';
import { generatePracticeQuizForSubLesson } from '../services/geminiService';
import { GlassCard } from '../components/common/GlassCard';

interface PracticeQuizViewProps {
    subLesson: SubLesson;
    onComplete: (score: number) => void;
    onExit: () => void;
}

export const PracticeQuizView: React.FC<PracticeQuizViewProps> = ({
    subLesson,
    onComplete,
    onExit
}) => {
    const { sourceLang, targetLang, completeSubLesson, addXp, profile, recordQuizOutcome } = useAppContext();

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<QuizText | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showResults, setShowResults] = useState(false);
    // Per-topic results accumulated as the user answers, flushed into the
    // learner profile when the quiz finishes.
    const topicOutcomesRef = useRef<{ topic: string; correct: number; total: number }[]>([]);

    // Load quiz questions
    useEffect(() => {
        const loadQuiz = async () => {
            setIsLoading(true);
            topicOutcomesRef.current = [];
            try {
                const quizQuestions = await generatePracticeQuizForSubLesson(
                    subLesson,
                    sourceLang,
                    targetLang,
                    profile.learnerProfile
                );
                setQuestions(quizQuestions);
            } catch (error) {
                console.error('Failed to load quiz:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadQuiz();
    }, [subLesson, sourceLang, targetLang]);

    const currentQuestion = questions[currentQuestionIndex];

    const compareAnswers = (a: QuizText, b: QuizText): boolean => {
        if (typeof a === 'string' && typeof b === 'string') {
            return a.trim() === b.trim();
        }
        if (typeof a === 'object' && typeof b === 'object') {
            return a.arabic === b.arabic && a.latin === b.latin;
        }
        return false;
    };

    const handleAnswerSelect = (answer: QuizText) => {
        if (isAnswered) return;

        setSelectedAnswer(answer);
        setIsAnswered(true);

        const isCorrect = compareAnswers(answer, currentQuestion.correctAnswer);
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        const topic = currentQuestion.topic || subLesson.title;
        topicOutcomesRef.current.push({ topic, correct: isCorrect ? 1 : 0, total: 1 });

        // Auto-advance after 2 seconds
        setTimeout(() => {
            handleNext();
        }, 2000);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            // Quiz complete
            const finalScore = Math.round((score / questions.length) * 100);
            const passThreshold = 70;

            if (finalScore >= passThreshold) {
                completeSubLesson(subLesson.id);
                addXp(subLesson.difficulty * 20); // Reward based on difficulty
            }

            recordQuizOutcome(topicOutcomesRef.current);
            setShowResults(true);
        }
    };

    const renderQuizText = (text: QuizText): string => {
        if (typeof text === 'string') return text;
        return `${text.arabic} (${text.latin})`;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-night-bg">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-brand-turquoise/30 border-t-brand-turquoise rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
                </div>
                <p className="mt-6 text-xl font-medium text-white/80 animate-pulse">
                    Constructing challenge...
                </p>
            </div>
        );
    }

    // Results View
    if (showResults) {
        const finalScore = Math.round((score / questions.length) * 100);
        const passed = finalScore >= 70;

        return (
            <div className="flex flex-col items-center justify-center h-full px-6 bg-night-bg relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-night-bg via-night-card to-night-bg"></div>
                <div className={`absolute inset-0 opacity-20 ${passed ? 'bg-brand-turquoise/20' : 'bg-gold/20'} animate-pulse`}></div>

                <GlassCard intensity="high" className="max-w-2xl w-full text-center p-12 relative z-10">
                    {/* Score Circle */}
                    <div className="relative w-56 h-56 mx-auto mb-10">
                        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="#1e293b"
                                strokeWidth="8"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke={passed ? '#008C8C' : '#D4AF37'}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${finalScore * 2.83} 283`}
                                className="transition-all duration-1000 ease-out drop-shadow-[0_0_10px_rgba(0,140,140,0.5)]"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black text-white drop-shadow-lg">
                                {finalScore}%
                            </span>
                            <span className="text-night-muted font-medium mt-2">
                                {score}/{questions.length} Correct
                            </span>
                        </div>
                    </div>

                    {/* Message */}
                    <h2 className="text-4xl font-bold mb-4 text-white">
                        {passed ? '🎉 Magnificent!' : '💪 Keep Training!'}
                    </h2>
                    <p className="text-xl mb-10 text-night-soft">
                        {passed
                            ? "You've mastered this technique. The path forward is open."
                            : `Mastery requires patience. You need 70% to pass.`
                        }
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-6 justify-center">
                        <button
                            onClick={onExit}
                            className="px-8 py-4 rounded-xl font-bold text-night-soft hover:text-white hover:bg-white/10 transition-all"
                        >
                            Return to Dojo
                        </button>
                        {passed && (
                            <button
                                onClick={() => {
                                    onComplete(finalScore);
                                    onExit();
                                }}
                                className="px-10 py-4 rounded-xl font-bold bg-gradient-to-r from-brand-turquoise to-teal-400 
                                    text-white hover:scale-105 hover:shadow-[0_0_20px_rgba(0,140,140,0.5)] transition-all"
                            >
                                Continue Journey →
                            </button>
                        )}
                    </div>
                </GlassCard>
            </div>
        );
    }

    if (!currentQuestion) return null;

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const isCorrect = isAnswered && selectedAnswer &&
        compareAnswers(selectedAnswer, currentQuestion.correctAnswer);

    return (
        <div className="h-full flex flex-col bg-night-bg relative overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-night-bg via-night-card to-night-bg pointer-events-none" />

            {/* Progress Header */}
            <div className="relative z-20 bg-night-bg/50 backdrop-blur-md border-b border-white/5">
                <div className="h-1 bg-night-card">
                    <div
                        className="h-full bg-gradient-to-r from-brand-turquoise to-teal-300 shadow-[0_0_10px_rgba(0,140,140,0.5)] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="px-6 py-4 flex justify-between items-center">
                    <button
                        onClick={onExit}
                        className="text-night-muted hover:text-white transition-colors text-sm font-medium"
                    >
                        ✕ Exit
                    </button>
                    <div className="text-night-muted font-medium">
                        Question {currentQuestionIndex + 1} <span className="text-dark-green/70">/ {questions.length}</span>
                    </div>
                    <div className="w-12"></div> {/* Spacer for centering */}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10 overflow-y-auto">
                <div className="w-full max-w-3xl">
                    {/* Question Card */}
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white leading-relaxed drop-shadow-lg">
                            {typeof currentQuestion.question === 'string'
                                ? currentQuestion.question
                                : renderQuizText(currentQuestion.question)
                            }
                        </h2>
                    </div>

                    {/* Answer Options */}
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = selectedAnswer && compareAnswers(selectedAnswer, option);
                            const isCorrectOption = compareAnswers(option, currentQuestion.correctAnswer);
                            const showCorrect = isAnswered && isCorrectOption;
                            const showWrong = isAnswered && isSelected && !isCorrect;

                            return (
                                <GlassCard
                                    key={index}
                                    onClick={() => handleAnswerSelect(option)}
                                    intensity="medium"
                                    hoverEffect={!isAnswered}
                                    className={`
                                        p-6 text-left transition-all duration-300
                                        ${isAnswered ? 'cursor-default' : ''}
                                        ${showCorrect ? '!bg-green-500/20 !border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : ''}
                                        ${showWrong ? '!bg-red-500/20 !border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}
                                        ${isSelected && !isAnswered ? '!border-brand-turquoise' : ''}
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xl font-medium ${showCorrect ? 'text-green-300' :
                                                showWrong ? 'text-red-300' : 'text-white'
                                            }`}>
                                            {renderQuizText(option)}
                                        </span>

                                        {showCorrect && (
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg animate-bounce">
                                                ✓
                                            </div>
                                        )}
                                        {showWrong && (
                                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg animate-pulse">
                                                ✕
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>

                    {/* Explanation */}
                    {isAnswered && currentQuestion.explanation && (
                        <div className="animate-[fadeIn_0.5s_ease-out]">
                            <GlassCard intensity="low" className="p-6 !bg-blue-500/10 !border-blue-400/30">
                                <div className="flex items-start gap-4">
                                    <span className="text-3xl">💡</span>
                                    <div>
                                        <p className="text-blue-300 font-bold mb-1 uppercase tracking-wider text-xs">Insight</p>
                                        <p className="text-night-text text-lg leading-relaxed">
                                            {currentQuestion.explanation}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

