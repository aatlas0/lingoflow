import React, { useState, useEffect } from 'react';
import {
    Sprout, Leaf, TreePine, Mountain, Target, Medal,
    BookOpen, Puzzle, Eye, PenLine, Lightbulb,
    FileText, Timer, TrendingUp, Map as MapIcon,
    type LucideIcon,
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { generatePlacementTest, gradeWriting, generateSkillTree, generateSagaMap } from '../services/geminiService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '../components/common/Button';
import { XP_PER_LEVEL } from '../constants/achievements';
import { INTEREST_OPTIONS, MIN_INTERESTS } from '../constants/interests';
import {
    BANDS_FOR_SELF_ASSESSED,
    scoreMcq,
    finalCefr,
    computeSkillScores,
    updateTopicStats,
    CEFR_TO_START_LEVEL,
    CEFR_LABELS,
    type McqResult,
} from '../utils/placement';
import type {
    QuizText,
    DarijaText,
    SelfAssessedLevel,
    PlacementTest,
    WritingGrade,
    LearnerProfile,
    SkillScores,
    CefrLevel,
} from '../types';

const isDarijaText = (text: QuizText): text is DarijaText =>
    text !== null && typeof text === 'object' && 'arabic' in text;

const getText = (text: QuizText): string =>
    isDarijaText(text) ? `${text.arabic} (${text.latin})` : text;

const areTextsEqual = (a: QuizText, b: QuizText): boolean => {
    if (isDarijaText(a) && isDarijaText(b)) return a.latin === b.latin;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    return false;
};

const SELF_ASSESSED_OPTIONS: { id: SelfAssessedLevel; title: string; blurb: string; Icon: LucideIcon }[] = [
    { id: 'new', title: 'Complete beginner', blurb: "I'm starting from zero.", Icon: Sprout },
    { id: 'elementary', title: 'Elementary', blurb: 'I know some words and simple phrases.', Icon: Leaf },
    { id: 'intermediate', title: 'Intermediate', blurb: 'I can handle everyday conversations.', Icon: TreePine },
    { id: 'advanced', title: 'Advanced', blurb: "I'm comfortable in most situations.", Icon: Mountain },
];

const CEFR_BLURBS: Record<CefrLevel, string> = {
    A1: "Fresh start — we'll begin with the very basics and build up fast.",
    A2: 'You already know your way around simple, everyday language.',
    B1: "Everyday conversations won't scare you — time to deepen it.",
    B2: 'Impressive command of the language — nuance is your next frontier.',
    C1: "Advanced — we'll keep the challenges coming.",
};

const SKILL_LABELS: { key: keyof SkillScores; label: string; Icon: LucideIcon }[] = [
    { key: 'vocabulary', label: 'Vocabulary', Icon: BookOpen },
    { key: 'grammar', label: 'Grammar', Icon: Puzzle },
    { key: 'reading', label: 'Reading', Icon: Eye },
    { key: 'writing', label: 'Writing', Icon: PenLine },
];

type Phase =
    | 'level' | 'interests' | 'ready'
    | 'loading' | 'mcq' | 'writing' | 'grading'
    | 'results' | 'roadmap' | 'error';

interface PlacementOutcome {
    cefr: CefrLevel;
    startLevel: number;
    correctCount: number;
    mcqTotal: number;
    skillScores: SkillScores;
    grades: WritingGrade[];
}

export const PlacementView: React.FC = () => {
    const {
        sourceLang, targetLang, profile, updateProfile, unlockAchievement,
        setView, isHighContrast, setSkillTree, setSagaMap, setError,
    } = useAppContext();

    const existing = profile.learnerProfile;
    const [phase, setPhase] = useState<Phase>('level');
    const [selfAssessed, setSelfAssessed] = useState<SelfAssessedLevel>(existing?.selfAssessed ?? 'new');
    const [interests, setInterests] = useState<string[]>(existing?.interests ?? []);
    const [test, setTest] = useState<PlacementTest | null>(null);
    const [mcqIndex, setMcqIndex] = useState(0);
    const [selected, setSelected] = useState<QuizText | null>(null);
    const [mcqResults, setMcqResults] = useState<McqResult[]>([]);
    const [topicOutcomes, setTopicOutcomes] = useState<{ topic: string; correct: number; total: number }[]>([]);
    const [writingIndex, setWritingIndex] = useState(0);
    const [writingAnswers, setWritingAnswers] = useState<string[]>([]);
    const [draft, setDraft] = useState('');
    const [outcome, setOutcome] = useState<PlacementOutcome | null>(null);
    // The profile object built from this test — passed straight to the
    // roadmap generators instead of trusting React state to have flushed.
    const [builtProfile, setBuiltProfile] = useState<LearnerProfile | null>(null);
    // The reveal moment: results mount dim with zero-width skill bars, then
    // this flips and the glow + staggered bar sweep play.
    const [revealed, setRevealed] = useState(false);
    useEffect(() => {
        if (phase !== 'results') {
            setRevealed(false);
            return;
        }
        const id = setTimeout(() => setRevealed(true), 150);
        return () => clearTimeout(id);
    }, [phase]);

    const cardClasses = isHighContrast
        ? 'bg-night-card/90 border-night-line'
        : 'bg-white/80 border-white/60';
    const titleColor = isHighContrast ? 'text-white' : 'text-dark-green';
    const subColor = isHighContrast ? 'text-night-soft' : 'text-dark-green/70';
    const chipBase = isHighContrast
        ? 'bg-night-card border-[#2A362F] text-night-text hover:border-brand-turquoise'
        : 'bg-white/95 border-dark-green/20 text-dark-green hover:border-brand-turquoise hover:shadow-lg';
    const chipActive = 'bg-brand-turquoise text-white border-brand-turquoise shadow-xl';

    const toggleInterest = (id: string) => {
        setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const startTest = async () => {
        setPhase('loading');
        setMcqIndex(0);
        setSelected(null);
        setMcqResults([]);
        setTopicOutcomes([]);
        setWritingIndex(0);
        setWritingAnswers([]);
        setDraft('');
        try {
            const generated = await generatePlacementTest(sourceLang, targetLang, selfAssessed);
            setTest(generated);
            setPhase('mcq');
        } catch (error) {
            console.error('Failed to generate placement test:', error);
            setPhase('error');
        }
    };

    const buildLearnerProfile = (
        cefr: CefrLevel,
        skillScores: SkillScores,
        outcomes: { topic: string; correct: number; total: number }[]
    ): LearnerProfile => {
        // Placement seeds the weak/strong areas from the skill breakdown; the
        // per-topic stats start accumulating from the test's own questions.
        const weakAreas = SKILL_LABELS.filter(s => skillScores[s.key] < 60).map(s => s.label.toLowerCase());
        const strongAreas = SKILL_LABELS.filter(s => skillScores[s.key] >= 85).map(s => s.label.toLowerCase());
        return {
            selfAssessed,
            cefr,
            skillScores,
            interests,
            weakAreas,
            strongAreas,
            topicStats: updateTopicStats(existing?.topicStats ?? [], outcomes),
            placementDate: new Date().toISOString(),
        };
    };

    const applyResult = (result: PlacementOutcome, outcomes: { topic: string; correct: number; total: number }[]): LearnerProfile => {
        const learnerProfile = buildLearnerProfile(result.cefr, result.skillScores, outcomes);
        updateProfile({
            level: result.startLevel,
            xp: (result.startLevel - 1) * XP_PER_LEVEL,
            placementDone: true,
            learnerProfile,
        });
        unlockAchievement('placement_complete');
        setOutcome(result);
        setBuiltProfile(learnerProfile);
        return learnerProfile;
    };

    const finishTest = async (finalResults: McqResult[], finalOutcomes: { topic: string; correct: number; total: number }[], answers: string[]) => {
        if (!test) return;
        setPhase('grading');

        let grades: WritingGrade[] = [];
        try {
            grades = await gradeWriting(
                test.writing.map((w, i) => ({ prompt: w.prompt, answer: answers[i] ?? '' })),
                sourceLang,
                targetLang
            );
        } catch (error) {
            // Writing grading is an enhancer, not a gate — fall back to MCQ-only.
            console.error('Writing grading failed:', error);
            grades = test.writing.map(() => ({ score: 0, feedback: '' }));
        }

        const answered = grades.filter((_, i) => (answers[i] ?? '').trim().length > 0);
        const writingAvg = answered.length > 0
            ? answered.reduce((sum, g) => sum + g.score, 0) / answered.length
            : null;

        const bands = BANDS_FOR_SELF_ASSESSED[selfAssessed];
        const cefr = finalCefr(scoreMcq(finalResults, bands), writingAvg);
        const result: PlacementOutcome = {
            cefr,
            startLevel: CEFR_TO_START_LEVEL[cefr],
            correctCount: finalResults.filter(r => r.isCorrect).length,
            mcqTotal: finalResults.length,
            skillScores: computeSkillScores(finalResults, writingAvg),
            grades,
        };
        applyResult(result, finalOutcomes);
        setPhase('results');
    };

    const handleSelect = (option: QuizText) => {
        if (!test || selected) return; // ignore double clicks while advancing
        setSelected(option);

        const question = test.mcq[mcqIndex];
        const isCorrect = areTextsEqual(option, question.correctAnswer);
        const nextResults = [...mcqResults, { skill: question.skill, cefr: question.cefr, isCorrect }];
        const nextOutcomes = question.topic
            ? [...topicOutcomes, { topic: question.topic, correct: isCorrect ? 1 : 0, total: 1 }]
            : topicOutcomes;
        setMcqResults(nextResults);
        setTopicOutcomes(nextOutcomes);

        // Give the answer feedback time to land — longer when wrong so the
        // learner can read the correct answer before it moves on.
        setTimeout(() => {
            setSelected(null);
            if (mcqIndex < test.mcq.length - 1) {
                setMcqIndex(i => i + 1);
            } else if (test.writing.length > 0) {
                setPhase('writing');
            } else {
                finishTest(nextResults, nextOutcomes, []);
            }
        }, isCorrect ? 650 : 1300);
    };

    const submitWriting = (skip: boolean) => {
        if (!test) return;
        const answers = [...writingAnswers];
        answers[writingIndex] = skip ? '' : draft;
        setWritingAnswers(answers);
        setDraft('');
        if (writingIndex < test.writing.length - 1) {
            setWritingIndex(i => i + 1);
        } else {
            finishTest(mcqResults, topicOutcomes, answers);
        }
    };

    // "Brand new" shortcut on the ready screen: a guaranteed-zero test helps
    // nobody — start at A1 with an interests-seeded profile and go straight
    // to roadmap building.
    const startFromZero = () => {
        const skillScores: SkillScores = { vocabulary: 0, grammar: 0, reading: 0, writing: 0 };
        const learnerProfile = applyResult({
            cefr: 'A1',
            startLevel: 1,
            correctCount: 0,
            mcqTotal: 0,
            skillScores,
            grades: [],
        }, []);
        buildRoadmap(learnerProfile, 1);
    };

    const buildRoadmap = async (learnerProfile: LearnerProfile | null | undefined, startLevel: number) => {
        setPhase('roadmap');
        try {
            const [tree, map] = await Promise.all([
                generateSkillTree(sourceLang, targetLang, startLevel, learnerProfile),
                generateSagaMap(sourceLang, targetLang, startLevel, learnerProfile),
            ]);
            setSkillTree(tree);
            setSagaMap(map);
        } catch (error) {
            // The saga map and training grounds can still generate lazily.
            console.error('Roadmap generation failed:', error);
            setError('Your roadmap will finish building the first time you open the map.');
        }
        setView('dashboard');
    };

    const skip = () => {
        try { localStorage.setItem(`placementDismissed-${targetLang.code}`, 'true'); } catch { /* ignore */ }
        setView('dashboard');
    };

    const StepShell: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
        <div className="flex items-center justify-center min-h-full p-4 animate-fade-in">
            <div className={`backdrop-blur-md rounded-3xl shadow-2xl border-2 p-6 md:p-10 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} ${cardClasses}`}>
                {children}
            </div>
        </div>
    );

    // --- Step 1: self-assessed level ---
    if (phase === 'level') {
        return (
            <StepShell>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 text-center ${subColor}`}>Step 1 of 3</p>
                <h1 className={`text-2xl md:text-3xl font-extrabold mb-2 text-center ${titleColor}`}>
                    How good is your {targetLang.name}?
                </h1>
                <p className={`mb-6 text-center ${subColor}`}>Your honest guess — the test will confirm it.</p>
                <div className="space-y-3">
                    {SELF_ASSESSED_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            onClick={() => { setSelfAssessed(option.id); setPhase('interests'); }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${selfAssessed === option.id ? chipActive : chipBase}`}
                        >
                            <option.Icon className={`w-8 h-8 shrink-0 ${selfAssessed === option.id ? '' : 'text-brand-turquoise'}`} strokeWidth={1.5} aria-hidden="true" />
                            <span>
                                <span className="block font-bold">{option.title}</span>
                                <span className={`block text-sm ${selfAssessed === option.id ? 'text-white/80' : subColor}`}>{option.blurb}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </StepShell>
        );
    }

    // --- Step 2: interests ---
    if (phase === 'interests') {
        return (
            <StepShell wide>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 text-center ${subColor}`}>Step 2 of 3</p>
                <h1 className={`text-2xl md:text-3xl font-extrabold mb-2 text-center ${titleColor}`}>
                    What do you love talking about?
                </h1>
                <p className={`mb-6 text-center ${subColor}`}>
                    Pick at least {MIN_INTERESTS} — your lessons, stories and quizzes will be built around them.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {INTEREST_OPTIONS.map(option => {
                        const active = interests.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => toggleInterest(option.id)}
                                aria-pressed={active}
                                className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${active ? chipActive : chipBase}`}
                            >
                                <span className="text-xl">{option.emoji}</span>
                                <span className="text-left leading-tight">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => setPhase('level')} variant="secondary" className="flex-1">← Back</Button>
                    <Button
                        onClick={() => setPhase('ready')}
                        disabled={interests.length < MIN_INTERESTS}
                        className="flex-[2] font-bold"
                    >
                        {interests.length < MIN_INTERESTS
                            ? `Pick ${MIN_INTERESTS - interests.length} more`
                            : 'Continue →'}
                    </Button>
                </div>
            </StepShell>
        );
    }

    // --- Step 3: get ready ---
    if (phase === 'ready') {
        return (
            <StepShell>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 text-center ${subColor}`}>Step 3 of 3</p>
                <div className="flex justify-center mb-4"><Target className="w-14 h-14 text-brand-turquoise" strokeWidth={1.5} aria-hidden="true" /></div>
                <h1 className={`text-2xl md:text-3xl font-extrabold mb-4 text-center ${titleColor}`}>
                    Time to find your real level
                </h1>
                <ul className={`space-y-2.5 mb-6 text-sm md:text-base ${subColor}`}>
                    <li className="flex gap-2.5"><FileText className="w-5 h-5 shrink-0 mt-0.5 text-brand-turquoise" strokeWidth={1.5} aria-hidden="true" /><span>About 24 questions — vocabulary, grammar, reading and a bit of writing.</span></li>
                    <li className="flex gap-2.5"><Timer className="w-5 h-5 shrink-0 mt-0.5 text-brand-turquoise" strokeWidth={1.5} aria-hidden="true" /><span>Takes 10–15 minutes. No time pressure on any question.</span></li>
                    <li className="flex gap-2.5"><TrendingUp className="w-5 h-5 shrink-0 mt-0.5 text-brand-turquoise" strokeWidth={1.5} aria-hidden="true" /><span>Questions get harder as you go. It's fine to get things wrong — that's the point.</span></li>
                    <li className="flex gap-2.5"><MapIcon className="w-5 h-5 shrink-0 mt-0.5 text-brand-turquoise" strokeWidth={1.5} aria-hidden="true" /><span>Your result builds a roadmap made just for you.</span></li>
                </ul>
                <Button onClick={startTest} className="w-full py-4 text-lg font-bold mb-3">Start the Test</Button>
                <div className="flex justify-between items-center">
                    <button onClick={() => setPhase('interests')} className={`text-sm font-bold underline hover:text-brand-turquoise ${subColor}`}>
                        ← Back
                    </button>
                    {selfAssessed === 'new' && (
                        <button onClick={startFromZero} className={`text-sm font-bold underline hover:text-brand-turquoise ${subColor}`}>
                            I'm brand new — start from zero
                        </button>
                    )}
                </div>
            </StepShell>
        );
    }

    if (phase === 'loading') {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${titleColor}`}>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-lg font-medium animate-pulse">Preparing your placement test…</p>
                <p className={`mt-1 text-sm ${subColor}`}>Tailored to your level — easiest to hardest.</p>
            </div>
        );
    }

    if (phase === 'grading') {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${titleColor}`}>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-lg font-medium animate-pulse">Analyzing your answers…</p>
                <p className={`mt-1 text-sm ${subColor}`}>Grading your writing and calculating your level.</p>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-xl text-deep-red">Couldn't load the placement test.</p>
                <div className="flex gap-3">
                    <Button onClick={startTest}>Try Again</Button>
                    <Button onClick={skip} variant="secondary">Skip for now</Button>
                </div>
            </div>
        );
    }

    if (phase === 'roadmap') {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${titleColor}`}>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-lg font-medium animate-pulse">Building your personal roadmap…</p>
                <p className={`mt-1 text-sm ${subColor}`}>Charting a {targetLang.name} journey around your level and interests.</p>
            </div>
        );
    }

    // --- Results ---
    if (phase === 'results' && outcome) {
        return (
            <div className="flex items-center justify-center min-h-full p-4 animate-fade-in">
                <div className={`backdrop-blur-md rounded-3xl shadow-2xl border-2 p-6 md:p-10 max-w-xl w-full ${cardClasses}`}>
                    <div className="flex justify-center mb-3">
                        <Medal className={`w-16 h-16 text-gold transition-all duration-700 ${revealed ? 'animate-ember-glow scale-100 opacity-100' : 'scale-50 opacity-0'}`} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h1 className={`text-3xl md:text-4xl font-extrabold mb-1 text-center transition-all duration-500 ${titleColor} ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
                        You're {outcome.cefr} — {CEFR_LABELS[outcome.cefr]}
                    </h1>
                    {outcome.mcqTotal > 0 && (
                        <p className={`text-center font-semibold mb-1 ${subColor}`}>
                            {outcome.correctCount} / {outcome.mcqTotal} questions correct
                        </p>
                    )}
                    <p className={`text-center mb-6 ${subColor}`}>{CEFR_BLURBS[outcome.cefr]}</p>

                    <div className="space-y-3 mb-6">
                        {SKILL_LABELS.map((skill, i) => (
                            <div key={skill.key}>
                                <div className={`flex justify-between text-sm font-bold mb-1 ${titleColor}`}>
                                    <span className="flex items-center gap-1.5"><skill.Icon className="w-4 h-4 text-brand-turquoise" strokeWidth={2} aria-hidden="true" /> {skill.label}</span>
                                    <span className="tabular-nums">{outcome.skillScores[skill.key]}%</span>
                                </div>
                                <div className={`h-2.5 rounded-full overflow-hidden ${isHighContrast ? 'bg-night-lift' : 'bg-gray-200'}`}>
                                    {/* Bars sweep in one after another once the reveal fires */}
                                    <div
                                        className="h-full bg-brand-turquoise rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: revealed ? `${outcome.skillScores[skill.key]}%` : '0%',
                                            transitionDelay: `${300 + i * 150}ms`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {outcome.grades.some(g => g.feedback && g.feedback !== 'No answer given.') && (
                        <div className={`rounded-xl border p-4 mb-6 text-sm space-y-2 ${isHighContrast ? 'border-night-edge bg-night-card/60 text-night-text' : 'border-dark-green/15 bg-white/60 text-dark-green/90'}`}>
                            <p className="font-bold flex items-center gap-1.5"><PenLine className="w-4 h-4 text-brand-turquoise" strokeWidth={2} aria-hidden="true" /> About your writing:</p>
                            {outcome.grades.map((g, i) => (
                                g.feedback && g.feedback !== 'No answer given.'
                                    ? <p key={i}>• {g.feedback}</p>
                                    : null
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={() => buildRoadmap(builtProfile, outcome.startLevel)}
                        className="w-full py-4 text-lg font-bold"
                    >
                        Build My Roadmap →
                    </Button>
                </div>
            </div>
        );
    }

    // --- Writing section ---
    if (phase === 'writing' && test) {
        const task = test.writing[writingIndex];
        const questionNumber = test.mcq.length + writingIndex + 1;
        const totalQuestions = test.mcq.length + test.writing.length;
        return (
            <div className="w-full h-full max-w-3xl mx-auto p-4 flex flex-col">
                <div className="shrink-0 flex items-center gap-4 mb-8 mt-2">
                    <div className={`h-3 rounded-full flex-1 overflow-hidden ${isHighContrast ? 'bg-night-lift' : 'bg-gray-200'}`}>
                        <div
                            className="h-full bg-brand-turquoise transition-all duration-500 ease-out"
                            style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
                        ></div>
                    </div>
                    <span className={`text-sm font-bold whitespace-nowrap ${titleColor}`}>
                        {questionNumber} / {totalQuestions}
                    </span>
                </div>

                <div className="flex-grow flex flex-col justify-center items-center pb-10">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${subColor}`}>
                        <PenLine className="w-4 h-4" strokeWidth={2} aria-hidden="true" /> Writing · answer in {targetLang.name}
                    </p>
                    <h2 className={`text-xl md:text-3xl font-extrabold mb-3 leading-tight text-center ${titleColor}`}>
                        {task.prompt}
                    </h2>
                    {task.guidance && <p className={`mb-6 text-sm text-center flex items-center justify-center gap-1.5 ${subColor}`}><Lightbulb className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" /> {task.guidance}</p>}

                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={4}
                        autoFocus
                        placeholder={`Write 1-3 sentences in ${targetLang.name}…`}
                        className={`w-full max-w-xl p-4 rounded-xl border-2 font-medium focus:ring-2 focus:ring-brand-turquoise focus:border-brand-turquoise outline-none transition-all resize-none
                            ${isHighContrast
                                ? 'bg-night-card border-night-edge text-white placeholder:text-ink-soft'
                                : 'bg-white/95 border-dark-green/20 text-dark-green placeholder:text-dark-green/40'}
                        `}
                    />
                    <div className="flex gap-3 mt-5 w-full max-w-xl">
                        <Button onClick={() => submitWriting(true)} variant="secondary" className="flex-1">Skip</Button>
                        <Button
                            onClick={() => submitWriting(false)}
                            disabled={draft.trim().length === 0}
                            className="flex-[2] font-bold"
                        >
                            {writingIndex < test.writing.length - 1 ? 'Next →' : 'Finish Test'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // --- MCQ section ---
    if (!test) return null;
    const question = test.mcq[mcqIndex];
    const totalQuestions = test.mcq.length + test.writing.length;

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
                <div className={`h-3 rounded-full flex-1 overflow-hidden ${isHighContrast ? 'bg-night-lift' : 'bg-gray-200'}`}>
                    <div
                        className="h-full bg-brand-turquoise transition-all duration-500 ease-out"
                        style={{ width: `${(mcqIndex / totalQuestions) * 100}%` }}
                    ></div>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${titleColor}`}>
                    {mcqIndex + 1} / {totalQuestions}
                </span>
            </div>

            {/* Question */}
            <div className="flex-grow flex flex-col justify-center items-center pb-10">
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${subColor}`}>
                    Placement · {question.skill} · difficulty rises as you go
                </p>
                <h2 className={`text-2xl md:text-4xl font-extrabold mb-10 leading-tight text-center ${titleColor}`}>
                    {getText(question.question)}
                </h2>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {question.options.map((option, index) => {
                        // Answer-state feedback: correct fills teal, wrong shakes red
                        // and the right answer is revealed with a teal ring.
                        let stateClasses = chipBase;
                        if (selected) {
                            const isThisSelected = areTextsEqual(selected, option);
                            const isThisCorrect = areTextsEqual(option, question.correctAnswer);
                            if (isThisSelected) {
                                stateClasses = isThisCorrect
                                    ? `${chipActive} scale-[1.02]`
                                    : 'bg-deep-red/10 text-deep-red border-deep-red animate-shake';
                            } else if (isThisCorrect) {
                                stateClasses = `${chipBase} !border-brand-turquoise ring-2 ring-brand-turquoise/40`;
                            } else {
                                stateClasses = `${chipBase} opacity-50`;
                            }
                        }
                        return (
                            <button
                                key={index}
                                onClick={() => handleSelect(option)}
                                disabled={!!selected}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 font-semibold ${stateClasses}`}
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
