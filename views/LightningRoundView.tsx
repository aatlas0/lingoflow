
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { generateQuiz } from '../services/geminiService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '../components/common/Button';
import { CircularProgress } from '../components/common/CircularProgress';
import type { QuizQuestion, QuizText, DarijaText } from '../types';
import { XP_GAINS } from '../constants/achievements';

const isDarijaText = (text: QuizText): text is DarijaText => {
    return typeof text === 'object' && 'arabic' in text;
};
const getText = (text: QuizText): string => {
    return isDarijaText(text) ? `${text.arabic} (${text.latin})` : text;
};
const areTextsEqual = (a: QuizText, b: QuizText): boolean => {
    if (isDarijaText(a) && isDarijaText(b)) return a.latin === b.latin;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    return false;
}

const GAME_DURATION = 60;

export const LightningRoundView = () => {
    const { sourceLang, targetLang, addXp, updateHighScore, profile, setError, isHighContrast } = useAppContext();
    const { t } = useLocalization();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
    const [isLoading, setIsLoading] = useState(false);

    const timerRef = useRef<number | null>(null);
    const isPrefetchingRef = useRef(false);

    // One 60s round burns through questions fast: fetch a big batch up front
    // and top it up in the background so the game never pauses mid-round.
    const BATCH_SIZE = 12;

    const loadQuestions = useCallback(async () => {
        setIsLoading(true);
        try {
            const newQuestions = await generateQuiz(sourceLang, targetLang, profile.level, BATCH_SIZE);
            setQuestions(newQuestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setQuestions([]);
        } finally {
            setIsLoading(false);
        }
    }, [sourceLang, targetLang, profile.level, setError]);

    const prefetchMoreQuestions = useCallback(() => {
        if (isPrefetchingRef.current) return;
        isPrefetchingRef.current = true;
        generateQuiz(sourceLang, targetLang, profile.level, BATCH_SIZE)
            .then(newQuestions => setQuestions(prev => [...prev, ...newQuestions]))
            // Never interrupt a running round over a failed top-up; the
            // round recycles earlier questions if it truly runs out.
            .catch(err => console.error('Lightning prefetch failed:', err))
            .finally(() => { isPrefetchingRef.current = false; });
    }, [sourceLang, targetLang, profile.level]);

    useEffect(() => {
        loadQuestions();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === 'playing') {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState('finished');
            updateHighScore(score);
            // XP is awarded once at the end of the round: per-answer awards
            // re-rendered the whole app on every tap (the lag) and could pop
            // the level-up modal mid-game.
            if (score > 0) addXp(score * XP_GAINS.LIGHTNING_CORRECT);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState, timeLeft, score, updateHighScore, addXp]);

    const startGame = () => {
        if (questions.length === 0) {
            setError("No questions loaded. Please try again.");
            return;
        }
        setScore(0);
        setCurrentQuestionIndex(0);
        setTimeLeft(GAME_DURATION);
        setGameState('playing');
    };

    const handleSelectAnswer = (selectedAnswer: QuizText) => {
        if (gameState !== 'playing') return;

        const currentQuestion = questions[currentQuestionIndex];
        if (areTextsEqual(selectedAnswer, currentQuestion.correctAnswer)) {
            setScore(prev => prev + 1);
        }

        // Recycle from the start if the prefetch hasn't landed yet — never
        // swap the game for a loading screen while the timer is running.
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex >= questions.length ? 0 : nextIndex);

        // Top up in the background when running low.
        if (questions.length - nextIndex <= 4) {
            prefetchMoreQuestions();
        }
    };

    if (isLoading) {
        return <div className={`flex flex-col items-center justify-center h-full ${isHighContrast ? 'text-white' : 'text-dark-green'}`}><LoadingSpinner size="lg" /><p className="mt-4 text-lg">{t('lightning.loading')}</p></div>;
    }

    if (gameState === 'ready') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-fade-in">
                <h1 className={`text-5xl font-bold mb-4 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{t('lightning.title')}</h1>
                <p className={`text-xl mb-10 max-w-md ${isHighContrast ? 'text-slate-300' : 'text-dark-green/80'}`}>{t('lightning.description', { duration: GAME_DURATION })}</p>
                <Button onClick={startGame} disabled={questions.length === 0} className="text-lg px-10 py-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                    {questions.length > 0 ? t('lightning.start') : t('lightning.loadingQuestions')}
                </Button>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 animate-fade-in">
                <div className={`p-10 rounded-3xl shadow-2xl border-2 backdrop-blur-md
                    ${isHighContrast
                        ? 'bg-night-card border-slate-700'
                        : 'bg-white/80 border-white'}
                `}>
                    <h1 className="text-5xl font-bold mb-6 text-deep-red">{t('lightning.timesUp')}</h1>
                    <p className={`text-3xl mb-2 font-bold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{t('lightning.yourScore', { score: score })}</p>
                    <p className={`text-lg mb-8 uppercase tracking-wider ${isHighContrast ? 'text-slate-400' : 'text-dark-green/70'}`}>{t('lightning.highScore', { highScore: profile.highScore })}</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button onClick={startGame}>{t('lightning.playAgain')}</Button>
                        <Button onClick={loadQuestions} variant="secondary">{t('lightning.newQuestions')}</Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="w-full h-full max-w-7xl mx-auto p-4 flex flex-col overflow-hidden animate-fade-in">
            {/* Header Stats */}
            <div className={`shrink-0 flex justify-between w-full items-center mb-4 p-3 rounded-xl shadow-sm border backdrop-blur-sm
                ${isHighContrast
                    ? 'bg-night-card/50 border-slate-700'
                    : 'bg-white/50 border-white/50'}
            `}>
                <div className={`text-lg font-bold flex flex-col items-center min-w-[80px] ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">{t('lightning.score')}</span>
                    <span className="text-brand-turquoise text-3xl leading-none">{score}</span>
                </div>

                <div className="transform scale-75 md:scale-100">
                    <CircularProgress progress={(timeLeft / GAME_DURATION) * 100} timeLeft={timeLeft} />
                </div>

                <div className={`text-lg font-bold flex flex-col items-center min-w-[80px] ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">{t('lightning.highScoreLabel')}</span>
                    <span className="text-gold text-3xl leading-none">{profile.highScore}</span>
                </div>
            </div>

            {currentQuestion ? (
                <div className="flex-grow flex flex-col md:flex-row gap-4 md:gap-8 overflow-hidden">
                    {/* Left: Question Card */}
                    <div className="md:w-5/12 flex flex-col">
                        <div className={`flex-grow backdrop-blur-sm p-6 md:p-10 rounded-3xl shadow-xl border-2 flex items-center justify-center text-center relative overflow-hidden transition-colors duration-300
                            ${isHighContrast
                                ? 'bg-night-card border-slate-700'
                                : 'bg-white/90 border-white'}
                        `}>
                            <div className={`absolute top-0 right-0 p-4 opacity-10 text-9xl ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>⚡️</div>
                            <h2 className={`text-2xl md:text-4xl lg:text-5xl font-bold leading-tight z-10 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                                {getText(currentQuestion.question)}
                            </h2>
                        </div>
                    </div>

                    {/* Right: Options Grid */}
                    <div className="md:w-7/12 flex flex-col justify-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 h-full max-h-[60vh] md:max-h-none">
                            {currentQuestion.options.map((option, index) => (
                                <Button
                                    key={index}
                                    onClick={() => handleSelectAnswer(option)}
                                    variant="ghost"
                                    className={`text-lg md:text-xl border-2 h-full py-4 px-6 shadow-md hover:shadow-xl transition-all flex items-center justify-center rounded-2xl
                                        ${isHighContrast
                                            ? 'bg-slate-800 border-slate-600 text-white hover:bg-brand-turquoise hover:border-brand-turquoise'
                                            : 'bg-white border-desert-dark text-dark-green hover:bg-brand-turquoise hover:border-brand-turquoise hover:text-white'}
                                    `}
                                >
                                    {getText(option)}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <LoadingSpinner />
            )}
        </div>
    );
};