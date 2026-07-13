import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { createChatSession, parseDarijaResponse, generateCulturalNuggets, type ChatSession } from '../services/geminiService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CulturalNuggetCard } from '../components/common/CulturalNuggetCard';
import type { ChatMessage, QuizText, DarijaText, CulturalNugget, Scenario } from '../types';
import { XP_GAINS } from '../constants/achievements';

const isDarijaText = (text: QuizText | string | CulturalNugget): text is DarijaText => {
    return typeof text === 'object' && text !== null && 'arabic' in text;
};

const ChatMessageDisplay: React.FC<{
    message: ChatMessage,
    isScenarioMode?: boolean,
    npcName?: string,
    disposition?: 'friendly' | 'neutral' | 'hostile'
}> = ({ message, isScenarioMode, npcName, disposition = 'neutral' }) => {
    const { isHighContrast } = useAppContext();

    if (message.role === 'nugget') {
        return <div className="max-w-md self-center w-full"><CulturalNuggetCard nugget={message.content as CulturalNugget} /></div>;
    }

    const isModel = message.role === 'model';

    // Avatar Logic
    const getAvatarStyles = () => {
        if (!isModel) return 'bg-brand-turquoise border-white text-white';

        if (isScenarioMode) {
            switch (disposition) {
                case 'hostile': return 'bg-red-900 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
                case 'friendly': return 'bg-emerald-900 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
                default: return 'bg-slate-800 border-slate-500 text-slate-300';
            }
        }

        return isHighContrast ? 'bg-slate-700 border-slate-500' : 'bg-white border-desert-dark text-desert-dark';
    };

    const Avatar = () => (
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl shrink-0 border-2 shadow-sm transition-all duration-300 ${getAvatarStyles()}`}>
            {isModel ? (isScenarioMode ? (disposition === 'hostile' ? '😠' : disposition === 'friendly' ? '😊' : '😐') : '🤖') : '👤'}
        </div>
    );

    // Bubble Styles
    const getBubbleClasses = () => {
        if (!isModel) return 'bg-brand-turquoise text-white rounded-tr-none shadow-md border border-brand-turquoise';

        if (isScenarioMode) {
            // RPG Style Bubble
            const base = 'rounded-tl-none border shadow-md backdrop-blur-sm ';
            switch (disposition) {
                case 'hostile': return base + 'bg-red-950/80 border-red-900 text-red-100';
                case 'friendly': return base + 'bg-emerald-950/80 border-emerald-900 text-emerald-100';
                default: return base + 'bg-slate-900/80 border-slate-700 text-slate-200';
            }
        }

        return (isHighContrast
            ? 'bg-night-card text-white border-slate-700'
            : 'bg-white text-dark-green border-desert-dark') + ' rounded-tl-none border shadow-sm';
    };

    const content = isDarijaText(message.content)
        ? (
            <div>
                <p className="text-lg font-bold">{(message.content as DarijaText).arabic}</p>
                <p className="text-sm opacity-90 border-t border-white/20 pt-1 mt-1">{(message.content as DarijaText).latin}</p>
            </div>
        )
        : <p className="font-medium leading-relaxed">{message.content as string}</p>;

    return (
        <div className={`flex gap-3 max-w-lg ${isModel ? 'self-start' : 'self-end flex-row-reverse'} animate-fade-in-up`}>
            <Avatar />
            <div className="flex flex-col">
                {isModel && isScenarioMode && npcName && (
                    <span className={`text-xs font-bold mb-1 ml-1 uppercase tracking-wider
                        ${disposition === 'hostile' ? 'text-red-400' : disposition === 'friendly' ? 'text-emerald-400' : 'text-slate-400'}
                    `}>
                        {npcName}
                    </span>
                )}
                <div className={`p-4 rounded-2xl ${getBubbleClasses()} transition-all`}>
                    {content}
                </div>
            </div>
        </div>
    );
};

import { CorrectionPanel } from '../components/chat/CorrectionPanel';
import { generateQuizFromCorrections } from '../services/geminiService';

interface Correction {
    original: string;
    corrected: string;
    explanation: string;
}

export const ChatView: React.FC = () => {
    const { sourceLang, targetLang, addXp, unlockAchievement, setError, updateQuestProgress, setCustomQuiz, setView, isHighContrast, currentScenario, addMistake, activeNodeId, completeNode } = useAppContext();
    const { t } = useLocalization();
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [corrections, setCorrections] = useState<Correction[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initialize Chat
    useEffect(() => {
        setHistory([]);
        setCorrections([]);
        const session = createChatSession(sourceLang, targetLang);
        setChatSession(session);
        unlockAchievement('polyglot');

        // AI Initiative for Scenarios
        if (currentScenario && currentScenario.opening_line) {
            const openingMessage: ChatMessage = {
                role: 'model',
                content: currentScenario.opening_line,
                timestamp: Date.now()
            };
            setHistory([openingMessage]);
        }
    }, [sourceLang, targetLang, currentScenario]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history]);

    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const langCode = targetLang.code === 'ary' ? 'ar' : targetLang.code;
            const voice = voices.find(v => v.lang.startsWith(langCode));
            if (voice) utterance.voice = voice;
            window.speechSynthesis.speak(utterance);
        }
    };

    const toggleListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = targetLang.code === 'ary' ? 'ar-MA' : targetLang.code;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
        };

        recognition.start();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !chatSession || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: userInput, timestamp: Date.now() };
        setHistory(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await chatSession.sendMessage({ message: userInput });
            const jsonResponse = JSON.parse(response.text);

            const reply = jsonResponse.reply;
            const correction = jsonResponse.correction;

            let modelContent: string | DarijaText = reply;
            if (targetLang.code === 'ary') {
                modelContent = parseDarijaResponse(reply);
            }

            const modelMessage: ChatMessage = { role: 'model', content: modelContent, timestamp: Date.now() };
            setHistory(prev => [...prev, modelMessage]);

            if (correction) {
                setCorrections(prev => [correction, ...prev]);
                addMistake({
                    original: correction.original,
                    correction: correction.corrected,
                    explanation: correction.explanation,
                    timestamp: Date.now(),
                    context: currentScenario?.title || 'Free Chat'
                });
            }

            addXp(XP_GAINS.CHAT_MESSAGE);
            updateQuestProgress('chat_message', 1);

            const textToSpeak = typeof modelContent === 'string' ? modelContent : modelContent.arabic;
            handleSpeak(textToSpeak);

        } catch (err) {
            console.error(err);
            const errorMessageContent = t('chat.tutorUnavailable');
            setError(errorMessageContent);
            const errorMessage: ChatMessage = { role: 'model', content: t('chat.tutorError'), timestamp: Date.now() };
            setHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndSession = () => {
        if (activeNodeId) {
            completeNode(activeNodeId, 100);
        }
        setChatSession(null);
        setHistory([]);
        setView('sagaMap');
    };

    const handlePracticeMistakes = async () => {
        setIsGeneratingQuiz(true);
        try {
            const quiz = await generateQuizFromCorrections(corrections, sourceLang, targetLang);
            setCustomQuiz(quiz);
            setView('quiz');
        } catch (error) {
            console.error("Failed to generate quiz", error);
            setError("Could not generate practice quiz. Please try again.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    if (showSummary) {
        return (
            <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-6 animate-fade-in">
                <div className={`backdrop-blur-md rounded-3xl shadow-xl p-8 border flex flex-col h-full
                    ${isHighContrast ? 'bg-night-card border-slate-700' : 'bg-white/80 border-white'}
                `}>
                    <h2 className={`text-3xl font-bold mb-6 text-center ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>📝 Session Summary</h2>

                    <div className="flex-grow overflow-y-auto custom-scrollbar mb-6 pr-2">
                        {corrections.length > 0 ? (
                            <div className="space-y-4">
                                <p className={`text-center mb-4 ${isHighContrast ? 'text-slate-400' : 'text-dark-green/70'}`}>Here are the things we corrected today:</p>
                                {corrections.map((c, i) => (
                                    <div key={i} className={`p-4 rounded-xl border shadow-sm ${isHighContrast ? 'bg-slate-800 border-slate-600' : 'bg-white border-desert-dark/30'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-red-500 font-bold">✕</span>
                                            <span className={`line-through ${isHighContrast ? 'text-slate-400' : 'text-dark-green/60'}`}>{c.original}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-green-500 font-bold">✓</span>
                                            <span className={`font-bold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>{c.corrected}</span>
                                        </div>
                                        <p className={`text-sm italic p-2 rounded-lg ${isHighContrast ? 'text-slate-300 bg-slate-700' : 'text-dark-green/80 bg-desert/20'}`}>
                                            💡 {c.explanation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🌟</div>
                                <h3 className={`text-xl font-bold ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>Perfect Session!</h3>
                                <p className={`${isHighContrast ? 'text-slate-400' : 'text-dark-green/70'}`}>You didn't make any mistakes. Amazing job!</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center shrink-0">
                        <button
                            onClick={() => setView('dashboard')}
                            className={`px-6 py-3 rounded-xl border-2 font-bold transition-colors
                                ${isHighContrast
                                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                                    : 'border-dark-green/20 text-dark-green hover:bg-gray-50'}
                            `}
                        >
                            Back to Dashboard
                        </button>
                        {corrections.length > 0 && (
                            <button
                                onClick={handlePracticeMistakes}
                                disabled={isGeneratingQuiz}
                                className="px-8 py-3 rounded-xl bg-brand-turquoise text-white font-bold hover:bg-[#007373] shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isGeneratingQuiz ? <LoadingSpinner size="sm" color="white" /> : '🎯 Practice These Mistakes'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- SCENARIO MODE STYLES ---
    const isScenario = !!currentScenario;
    const bgClass = isScenario
        ? 'bg-slate-900'
        : (isHighContrast ? 'bg-slate-900' : 'bg-transparent'); // Default app bg handles standard mode

    // Vignette for Scenario
    const vignette = isScenario
        ? <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-0"></div>
        : null;

    return (
        <div className={`flex flex-col h-full w-full max-w-7xl mx-auto p-4 overflow-hidden relative animate-fade-in ${bgClass}`}>
            {vignette}

            {/* Mission Header (Scenario Mode) */}
            {isScenario && currentScenario && (
                <div className="shrink-0 mb-4 relative z-10">
                    <div className={`
                        p-4 rounded-2xl border shadow-lg flex items-center gap-4 backdrop-blur-md
                        ${currentScenario.disposition === 'hostile' ? 'bg-red-950/60 border-red-900/50' :
                            currentScenario.disposition === 'friendly' ? 'bg-emerald-950/60 border-emerald-900/50' :
                                'bg-slate-800/80 border-slate-700'}
                    `}>
                        <div className={`
                            w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-inner
                            ${currentScenario.disposition === 'hostile' ? 'bg-red-900/50 text-red-200' :
                                currentScenario.disposition === 'friendly' ? 'bg-emerald-900/50 text-emerald-200' :
                                    'bg-slate-700/50 text-slate-200'}
                        `}>
                            {currentScenario.type === 'combat' ? '⚔️' :
                                currentScenario.type === 'negotiation' ? '💰' :
                                    currentScenario.type === 'investigation' ? '🕵️' : '💬'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h2 className="text-lg font-bold text-white truncate pr-2">{currentScenario.title}</h2>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border
                                    ${currentScenario.disposition === 'hostile' ? 'border-red-500 text-red-400 bg-red-950' :
                                        currentScenario.disposition === 'friendly' ? 'border-emerald-500 text-emerald-400 bg-emerald-950' :
                                            'border-slate-500 text-slate-400 bg-slate-900'}
                                `}>
                                    {currentScenario.disposition || 'Neutral'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-300 line-clamp-1">{currentScenario.objective}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                <span>📍 {currentScenario.situation}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Header (Free Chat Mode) */}
            {!isScenario && (
                <div className="shrink-0 flex justify-between items-center mb-4 relative z-10">
                    <h1 className={`text-2xl font-bold flex items-center gap-2 ${isHighContrast ? 'text-white' : 'text-dark-green'}`}>
                        <span>💬</span> {t('chat.title', { language: targetLang.name })}
                    </h1>
                    <button
                        onClick={handleEndSession}
                        className="bg-red-500/10 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-500/20 transition-colors text-sm"
                    >
                        End Session
                    </button>
                </div>
            )}

            <div className="flex-grow flex gap-6 overflow-hidden min-h-0 relative z-10">
                {/* Left: Chat Area (70%) */}
                <div className={`flex-grow md:w-[70%] flex flex-col backdrop-blur-sm border rounded-3xl shadow-xl overflow-hidden relative min-h-0 transition-colors duration-500
                    ${isScenario
                        ? 'bg-slate-900/50 border-slate-700'
                        : (isHighContrast ? 'bg-night-card/40 border-slate-700' : 'bg-white/40 border-white')}
                `}>

                    {/* Messages */}
                    <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth min-h-0 custom-scrollbar">
                        {history.length === 0 && !currentScenario && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                <div className="text-6xl mb-4">👋</div>
                                <p className={`text-xl font-medium ${isHighContrast ? 'text-slate-400' : 'text-dark-green'}`}>{t('chat.start')}</p>
                            </div>
                        )}
                        {history.map((msg) => (
                            <div key={msg.timestamp} className="flex flex-col">
                                <ChatMessageDisplay
                                    message={msg}
                                    isScenarioMode={isScenario}
                                    npcName={currentScenario?.character_role}
                                    disposition={currentScenario?.disposition}
                                />
                                {msg.role === 'model' && (
                                    <button
                                        onClick={() => handleSpeak(typeof msg.content === 'string' ? msg.content : (msg.content as DarijaText).arabic)}
                                        className={`self-start ml-14 mt-1 text-xs flex items-center gap-1 hover:text-brand-turquoise transition-colors
                                            ${isScenario ? 'text-slate-500 hover:text-slate-300' : (isHighContrast ? 'text-slate-500' : 'text-dark-green/60')}
                                        `}
                                    >
                                        🔊 Listen
                                    </button>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className={`self-start ml-14 p-4 rounded-2xl rounded-tl-none shadow-sm inline-block 
                                ${isScenario ? 'bg-slate-800 border border-slate-700' : (isHighContrast ? 'bg-night-card' : 'bg-white')}
                            `}>
                                <LoadingSpinner size="sm" color={isScenario ? "white" : "teal"} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className={`p-4 backdrop-blur-md border-t 
                        ${isScenario
                            ? 'bg-slate-900/80 border-slate-700'
                            : (isHighContrast ? 'bg-night-card/60 border-slate-700' : 'bg-white/60 border-white/50')}
                    `}>
                        <form onSubmit={handleSubmit} className="flex gap-3 w-full">
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`p-4 rounded-xl transition-all ${isListening
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : (isScenario
                                        ? 'bg-slate-800 border-2 border-slate-600 text-white hover:bg-slate-700'
                                        : (isHighContrast ? 'bg-slate-800 border-2 border-slate-600 text-white hover:bg-slate-700' : 'bg-white border-2 border-desert-dark/50 text-dark-green hover:bg-gray-50'))
                                    }`}
                                title="Voice Input"
                            >
                                🎤
                            </button>
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={t('chat.placeholder', { language: targetLang.name })}
                                className={`flex-grow border-2 rounded-xl p-4 focus:ring-2 focus:ring-brand-turquoise focus:border-brand-turquoise shadow-inner transition-all
                                    ${isScenario
                                        ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500'
                                        : (isHighContrast
                                            ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500'
                                            : 'bg-white border-desert-dark/50 text-dark-green placeholder:text-dark-green/40')}
                                `}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !userInput.trim()}
                                className="bg-brand-turquoise text-white px-6 md:px-8 rounded-xl font-bold hover:bg-[#007373] disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {t('chat.send')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right: Corrections Panel (30%) - Hidden on mobile */}
                <div className={`hidden md:block md:w-[30%] shrink-0 backdrop-blur-sm rounded-3xl border shadow-lg overflow-hidden
                    ${isScenario
                        ? 'bg-slate-900/60 border-slate-700'
                        : (isHighContrast ? 'bg-night-card/60 border-slate-700' : 'bg-white/60 border-white')}
                `}>
                    <CorrectionPanel corrections={corrections} />
                    {currentScenario && (
                        <div className="p-4 border-t border-white/20">
                            <button
                                onClick={handleEndSession}
                                className="w-full bg-red-500/10 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-500/20 transition-colors text-sm"
                            >
                                End Mission
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};