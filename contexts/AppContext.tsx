
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from './AuthContext';
import { fetchProfile, saveProfile, fetchLanguageState, saveLanguageState, extractProgress, FRESH_LANGUAGE_PROGRESS } from '../services/progressService';
import type { Language, UserProfile, AppView, Quest, QuestType, QuizQuestion, SkillTree, SkillNode, NodeState, SagaMap, MapNode, Scenario, Mistake, SubLesson } from '../types';
import { LANGUAGES } from '../constants/languages';
import { ACHIEVEMENTS } from '../constants/achievements';

interface AppContextType {
  sourceLang: Language;
  targetLang: Language;
  setSourceLang: (lang: Language) => void;
  setTargetLang: (lang: Language) => void;
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  isHydrating: boolean;
  addXp: (amount: number) => void;
  completeQuiz: () => void;
  updateHighScore: (score: number) => void;
  unlockAchievement: (achievementId: string) => void;
  showAchievementToast: (achievementId: string) => void;
  addMistake: (mistake: Mistake) => void;
  completeSubLesson: (subLessonId: string) => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  error: string | null;
  setError: (error: string | null) => void;
  dailyQuests: Quest[];
  updateQuestProgress: (type: QuestType, amount: number) => void;
  // Level Up
  showLevelUpModal: boolean;
  newLevel: number;
  closeLevelUpModal: () => void;
  // Custom Quiz
  customQuiz: QuizQuestion[] | null;
  setCustomQuiz: (quiz: QuizQuestion[] | null) => void;
  // Training Grounds
  currentSubLesson: SubLesson | null;
  setCurrentSubLesson: (subLesson: SubLesson | null) => void;
  // Skill Tree
  skillTree: SkillTree | null;
  setSkillTree: (tree: SkillTree) => void;
  // Saga Map
  sagaMap: SagaMap | null;
  setSagaMap: (map: SagaMap) => void;
  completeNode: (nodeId: string, score: number) => void;
  // Scenario State
  currentScenario: Scenario | null;
  setCurrentScenario: (scenario: Scenario | null) => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Daily quest variants — picked deterministically per calendar day so the
// quests vary day to day but stay stable within one day.
const QUEST_VARIANTS: Record<QuestType, { target: number; rewardXP: number; description: string }[]> = {
  quiz_complete: [
    { target: 2, rewardXP: 40, description: 'Complete 2 Quizzes' },
    { target: 3, rewardXP: 50, description: 'Complete 3 Quizzes' },
    { target: 4, rewardXP: 70, description: 'Complete 4 Quizzes' },
  ],
  xp_earn: [
    { target: 100, rewardXP: 30, description: 'Earn 100 XP' },
    { target: 150, rewardXP: 40, description: 'Earn 150 XP' },
    { target: 250, rewardXP: 60, description: 'Earn 250 XP' },
  ],
  chat_message: [
    { target: 5, rewardXP: 20, description: 'Send 5 messages to your AI tutor' },
    { target: 8, rewardXP: 30, description: 'Send 8 messages to your AI tutor' },
    { target: 12, rewardXP: 45, description: 'Send 12 messages to your AI tutor' },
  ],
};

// Remembers the language pair on this device as a fallback for databases
// that don't have the profile columns yet.
const persistLangPairLocally = (patch: { source?: string; target?: string }) => {
  try {
    const current = JSON.parse(localStorage.getItem('langPair') || '{}');
    localStorage.setItem('langPair', JSON.stringify({ ...current, ...patch }));
  } catch { /* storage unavailable — non-fatal */ }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sourceLang, setSourceLangState] = useState<Language>(LANGUAGES[0]); // Default to English
  const [targetLang, setTargetLangState] = useState<Language>(LANGUAGES[1]); // Default to Spanish
  const { profile, setProfile, addXp: rawAddXp, completeQuiz: rawCompleteQuiz, updateHighScore: rawUpdateHighScore, unlockAchievement: rawUnlockAchievement, addMistake, completeSubLesson } = useUserProfile();
  // Dark mode: user's saved choice wins, otherwise follow the device theme.
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [unlockedAchievementId, setUnlockedAchievementId] = useState<string | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const previousLevelRef = React.useRef(profile.level);

  // Custom Quiz State
  const [customQuiz, setCustomQuiz] = useState<QuizQuestion[] | null>(null);

  // Training Grounds State
  const [currentSubLesson, setCurrentSubLesson] = useState<SubLesson | null>(null);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, [setProfile]);

  // Skill Tree State
  const [skillTree, setSkillTreeState] = useState<SkillTree | null>(null);

  // Saga Map State
  const [sagaMap, setSagaMapState] = useState<SagaMap | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Load Skill Tree & Saga Map from local storage
  useEffect(() => {
    const savedTree = localStorage.getItem('skillTree');
    if (savedTree) {
      setSkillTreeState(JSON.parse(savedTree));
    }
    const savedMap = localStorage.getItem('sagaMap');
    if (savedMap) {
      setSagaMapState(JSON.parse(savedMap));
    }
  }, []);

  // Save Skill Tree to local storage
  useEffect(() => {
    if (skillTree) {
      localStorage.setItem('skillTree', JSON.stringify(skillTree));
    }
  }, [skillTree]);

  // Save Saga Map to local storage
  useEffect(() => {
    if (sagaMap) {
      localStorage.setItem('sagaMap', JSON.stringify(sagaMap));
    }
  }, [sagaMap]);

  // --- Supabase progress sync ---
  const { user, username } = useAuth();
  const isHydratedRef = useRef(false);
  const [isHydrating, setIsHydrating] = useState(false);
  // Language-pair restore must run once per login, NOT on every language
  // switch — otherwise a not-yet-saved switch would be yanked back.
  const restoredLangForUserRef = useRef<string | null>(null);
  // The profile as fetched at login — the source for one-time adoption of
  // legacy account-level progress into its language's record.
  const loginProfileRef = useRef<UserProfile | null>(null);

  // Hydrate from the server on login (and re-fetch language state on language switch).
  useEffect(() => {
    isHydratedRef.current = false; // block saves while (re)hydrating
    if (!user) {
      setIsHydrating(false);
      return;
    }
    let cancelled = false;
    setIsHydrating(true);
    // Re-runs of this effect for the same user are language switches: the
    // account-global fields are already live locally (and possibly newer
    // than the server), so only the language state is fetched then.
    const isLanguageSwitch = restoredLangForUserRef.current === user.id;
    (async () => {
      const [serverProfile, langState] = await Promise.all([
        isLanguageSwitch ? Promise.resolve(null) : fetchProfile(user.id),
        fetchLanguageState(user.id, targetLang.code),
      ]);
      if (cancelled) return;

      if (!isLanguageSwitch) {
        loginProfileRef.current = serverProfile;
        if (!serverProfile) {
          // First login: create the row so the account always has a profile.
          await saveProfile(user.id, username, profile);
        }
      }

      // Restore the saved language pair (server first, device fallback).
      // Must run before applying progress — it may switch the language.
      if (!isLanguageSwitch) {
        restoredLangForUserRef.current = user.id;
        let sourceCode = serverProfile?.sourceLangCode ?? undefined;
        let targetCode = serverProfile?.targetLangCode ?? undefined;
        if (!targetCode) {
          try {
            const local = JSON.parse(localStorage.getItem('langPair') || 'null');
            sourceCode = sourceCode ?? local?.source;
            targetCode = local?.target;
          } catch { /* ignore */ }
        }
        const source = LANGUAGES.find(l => l.code === sourceCode);
        const target = LANGUAGES.find(l => l.code === targetCode);
        if (source) setSourceLangState(source);
        if (target && currentView === 'home') setView('dashboard'); // returning users skip the picker
        if (target && target.code !== targetLang.code) {
          // Adopt the account globals (streak, achievements…) now; the
          // re-run of this effect hydrates the language-specific part.
          if (serverProfile) {
            previousLevelRef.current = Math.max(previousLevelRef.current, serverProfile.level);
            updateProfile(serverProfile);
          }
          setTargetLangState(target);
          return;
        }
      }

      // Per-language progress: prefer this language's own record; adopt the
      // legacy account-level values once for the language the account was
      // last using; a brand-new language starts fresh at level 1.
      const legacySource = serverProfile ?? loginProfileRef.current;
      const legacyBelongsHere = legacySource != null &&
        (legacySource.targetLangCode == null || legacySource.targetLangCode === targetLang.code);
      const progress = langState.progress
        ?? (legacyBelongsHere ? extractProgress(legacySource) : FRESH_LANGUAGE_PROGRESS);

      updateProfile({ ...(serverProfile ?? {}), ...progress });
      // Levels arriving via sync or language switch aren't "level ups".
      previousLevelRef.current = progress.level;

      setSkillTreeState(langState.skillTree);
      setSagaMapState(langState.sagaMap);
      isHydratedRef.current = true;
      setIsHydrating(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, targetLang.code]);

  // Debounced save of profile changes.
  useEffect(() => {
    if (!user || !isHydratedRef.current) return;
    const timer = setTimeout(() => {
      if (isHydratedRef.current) saveProfile(user.id, username, profile);
    }, 1500);
    return () => clearTimeout(timer);
  }, [profile, user, username]);

  // Debounced save of per-language state: generated content AND progress
  // (level, xp, mistakes, lessons) for the current target language.
  useEffect(() => {
    if (!user || !isHydratedRef.current) return;
    const timer = setTimeout(() => {
      if (isHydratedRef.current) {
        saveLanguageState(user.id, targetLang.code, skillTree, sagaMap, extractProgress(profile));
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [skillTree, sagaMap, profile, user, targetLang.code]);

  // Latest-state mirror so the language switcher can flush without stale closures.
  const latestStateRef = useRef({ profile, skillTree, sagaMap, targetLang });
  useEffect(() => {
    latestStateRef.current = { profile, skillTree, sagaMap, targetLang };
  });

  const setSkillTree = useCallback((tree: SkillTree) => {
    setSkillTreeState(tree);
  }, []);

  const setSagaMap = useCallback((map: SagaMap) => {
    setSagaMapState(map);
  }, []);

  const completeNode = useCallback((nodeId: string, score: number) => {
    setSagaMapState(prevMap => {
      if (!prevMap) return null;
      const newMap = { ...prevMap };
      const nodeIndex = newMap.nodes.findIndex(n => n.id === nodeId);

      if (nodeIndex === -1) return prevMap;

      const node = newMap.nodes[nodeIndex];

      // Update status
      if (score >= 5) { // Assuming 5 is perfect/good score
        node.status = 'perfect';
      } else {
        node.status = 'completed';
      }

      // Unlock next node
      if (nodeIndex < newMap.nodes.length - 1) {
        newMap.nodes[nodeIndex + 1].status = 'available';
        newMap.userPosition = newMap.nodes[nodeIndex + 1].id;
      }

      return newMap;
    });
  }, []);

  useEffect(() => {
    if (profile.level > previousLevelRef.current) {
      setNewLevel(profile.level);
      setShowLevelUpModal(true);
      previousLevelRef.current = profile.level;
    }
  }, [profile.level]);

  const closeLevelUpModal = useCallback(() => setShowLevelUpModal(false), []);

  const toggleHighContrast = useCallback(() => setIsHighContrast(prev => !prev), []);

  // Apply High Contrast (Dark Mode) class to body and remember the choice
  useEffect(() => {
    if (isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('darkMode', String(isHighContrast));
  }, [isHighContrast]);

  const setView = useCallback((view: AppView) => {
    setError(null);
    setCurrentView(view);
  }, []);

  const showAchievementToast = useCallback((achievementId: string) => {
    setUnlockedAchievementId(achievementId);
    setTimeout(() => setUnlockedAchievementId(null), 4000); // Hide after 4 seconds
  }, []);

  const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);

  // Load or generate quests on mount
  useEffect(() => {
    const savedQuests = localStorage.getItem('dailyQuests');
    const savedDate = localStorage.getItem('dailyQuestsDate');
    const today = new Date().toDateString();

    if (savedQuests && savedDate === today) {
      setDailyQuests(JSON.parse(savedQuests));
    } else {
      generateDailyQuests();
    }
  }, []);

  // Save quests whenever they change
  useEffect(() => {
    if (dailyQuests.length > 0) {
      localStorage.setItem('dailyQuests', JSON.stringify(dailyQuests));
      localStorage.setItem('dailyQuestsDate', new Date().toDateString());
    }
  }, [dailyQuests]);

  const generateDailyQuests = useCallback(() => {
    // Seed a small PRNG with today's date so everyone gets the same rotation
    // for the day, but tomorrow's quests are different.
    const dayKey = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < dayKey.length; i++) seed = (seed * 31 + dayKey.charCodeAt(i)) | 0;
    const rand = () => { // mulberry32
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const types: QuestType[] = ['quiz_complete', 'xp_earn', 'chat_message'];
    const newQuests: Quest[] = types.map((type, i) => {
      const variants = QUEST_VARIANTS[type];
      const variant = variants[Math.floor(rand() * variants.length)];
      return {
        id: `q${i + 1}`,
        type,
        description: variant.description,
        target: variant.target,
        progress: 0,
        rewardXP: variant.rewardXP,
        isClaimed: false,
      };
    });
    setDailyQuests(newQuests);
  }, []);

  const updateQuestProgress = useCallback((type: QuestType, amount: number) => {
    setDailyQuests(prev => prev.map(quest => {
      if (quest.type === type && !quest.isClaimed && quest.progress < quest.target) {
        const newProgress = Math.min(quest.progress + amount, quest.target);
        if (newProgress >= quest.target && quest.progress < quest.target) {
          rawAddXp(quest.rewardXP);
          return { ...quest, progress: newProgress, isClaimed: true };
        }
        return { ...quest, progress: newProgress };
      }
      return quest;
    }));
  }, [rawAddXp]);



  const addXp = useCallback((amount: number) => {
    const newAchievements = rawAddXp(amount);
    newAchievements.forEach(showAchievementToast);
    updateQuestProgress('xp_earn', amount);
  }, [rawAddXp, showAchievementToast, updateQuestProgress]);

  const completeQuiz = useCallback(() => {
    const newAchievements = rawCompleteQuiz();
    newAchievements.forEach(showAchievementToast);
    updateQuestProgress('quiz_complete', 1);
  }, [rawCompleteQuiz, showAchievementToast, updateQuestProgress]);

  const updateHighScore = useCallback((score: number) => {
    const newAchievements = rawUpdateHighScore(score);
    newAchievements.forEach(showAchievementToast);
  }, [rawUpdateHighScore, showAchievementToast]);

  const unlockAchievement = useCallback((achievementId: string) => {
    const newAchievements = rawUnlockAchievement(achievementId);
    newAchievements.forEach(showAchievementToast);
  }, [rawUnlockAchievement, showAchievementToast]);

  const setSourceLang = useCallback((lang: Language) => {
    setSourceLangState(lang);
    updateProfile({ sourceLangCode: lang.code });
    persistLangPairLocally({ source: lang.code });
  }, [updateProfile]);

  const setTargetLang = useCallback((lang: Language) => {
    // Flush the outgoing language's pending progress immediately — the
    // debounced savers get cancelled by the language change.
    const prev = latestStateRef.current;
    if (user && isHydratedRef.current && prev.targetLang.code !== lang.code) {
      saveProfile(user.id, username, { ...prev.profile, targetLangCode: lang.code });
      saveLanguageState(user.id, prev.targetLang.code, prev.skillTree, prev.sagaMap, extractProgress(prev.profile));
    }
    setTargetLangState(lang);
    updateProfile({ targetLangCode: lang.code });
    persistLangPairLocally({ target: lang.code });
    if (lang.code === 'ary') {
      unlockAchievement('darija_explorer');
    }
  }, [unlockAchievement, updateProfile, user, username]);



  const value = React.useMemo(() => ({
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    profile,
    updateProfile,
    isHydrating,
    addXp,
    completeQuiz,
    updateHighScore,
    unlockAchievement,
    showAchievementToast,
    addMistake,
    completeSubLesson,
    isHighContrast,
    toggleHighContrast,
    currentView,
    setView,
    error,
    setError,
    dailyQuests,
    updateQuestProgress,
    showLevelUpModal,
    newLevel,
    closeLevelUpModal,
    customQuiz,
    setCustomQuiz,
    currentSubLesson,
    setCurrentSubLesson,
    skillTree,
    setSkillTree,
    sagaMap,
    setSagaMap,
    completeNode,
    currentScenario,
    setCurrentScenario,
    activeNodeId,
    setActiveNodeId,
  }), [
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    profile,
    updateProfile,
    isHydrating,
    addXp,
    completeQuiz,
    updateHighScore,
    unlockAchievement,
    showAchievementToast,
    addMistake,
    completeSubLesson,
    isHighContrast,
    currentView,
    setView,
    error,
    dailyQuests,
    updateQuestProgress,
    showLevelUpModal,
    newLevel,
    closeLevelUpModal,
    customQuiz,
    currentSubLesson,
    skillTree,
    setSkillTree,
    sagaMap,
    setSagaMap,
    completeNode,
    currentScenario,
    activeNodeId
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* This is where the achievement animation is triggered */}
      {unlockedAchievementId && <AchievementToast achievement={ACHIEVEMENTS[unlockedAchievementId]} />}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Achievement Toast Component
const AchievementToast: React.FC<{ achievement: any }> = ({ achievement }) => {
  if (!achievement) return null;

  // Animation is handled by Tailwind classes in combination with React's rendering
  return (
    <div
      // Accessibility: role="alert" makes screen readers announce this immediately
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-4 rounded-lg bg-purple-600 p-4 text-white shadow-lg animate-fade-in-up"
    >
      <div className="text-3xl">{achievement.icon}</div>
      <div>
        <p className="font-bold">Achievement Unlocked!</p>
        <p className="text-sm">{achievement.name}</p>
      </div>
    </div>
  );
};