
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from './AuthContext';
import { fetchProfile, saveProfile, fetchLanguageState, saveLanguageState } from '../services/progressService';
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
  updateNodeProgress: (nodeId: string, action: 'practice' | 'anchor') => void;
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sourceLang, setSourceLangState] = useState<Language>(LANGUAGES[0]); // Default to English
  const [targetLang, setTargetLangState] = useState<Language>(LANGUAGES[1]); // Default to Spanish
  const { profile, setProfile, addXp: rawAddXp, completeQuiz: rawCompleteQuiz, updateHighScore: rawUpdateHighScore, unlockAchievement: rawUnlockAchievement, addMistake, completeSubLesson } = useUserProfile();
  const [isHighContrast, setIsHighContrast] = useState(false);
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

  // Hydrate from the server on login (and re-fetch language state on language switch).
  useEffect(() => {
    isHydratedRef.current = false; // block saves while (re)hydrating
    if (!user) {
      return;
    }
    let cancelled = false;
    (async () => {
      const [serverProfile, langState] = await Promise.all([
        fetchProfile(user.id),
        fetchLanguageState(user.id, targetLang.code),
      ]);
      if (cancelled) return;

      if (serverProfile) {
        updateProfile(serverProfile);
      } else {
        // First login: create the row so the account always has a profile.
        await saveProfile(user.id, username, profile);
      }
      setSkillTreeState(langState.skillTree);
      setSagaMapState(langState.sagaMap);
      isHydratedRef.current = true;
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

  // Debounced save of generated content (skill tree / saga map) per language.
  useEffect(() => {
    if (!user || !isHydratedRef.current) return;
    if (!skillTree && !sagaMap) return;
    const timer = setTimeout(() => {
      if (isHydratedRef.current) saveLanguageState(user.id, targetLang.code, skillTree, sagaMap);
    }, 1500);
    return () => clearTimeout(timer);
  }, [skillTree, sagaMap, user, targetLang.code]);

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

  const updateNodeProgress = useCallback((nodeId: string, action: 'practice' | 'anchor') => {
    // Disabled for now
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

  // Apply High Contrast (Dark Mode) class to body
  useEffect(() => {
    if (isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
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
    const newQuests: Quest[] = [
      {
        id: 'q1',
        type: 'quiz_complete',
        description: 'Complete 3 Quizzes',
        target: 3,
        progress: 0,
        rewardXP: 50,
        isClaimed: false
      },
      {
        id: 'q2',
        type: 'xp_earn',
        description: 'Earn 100 XP',
        target: 100,
        progress: 0,
        rewardXP: 30,
        isClaimed: false
      },
      {
        id: 'q3',
        type: 'chat_message',
        description: 'Send 5 Chat Messages',
        target: 5,
        progress: 0,
        rewardXP: 20,
        isClaimed: false
      }
    ];
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

  const setTargetLang = useCallback((lang: Language) => {
    setTargetLangState(lang);
    if (lang.code === 'ary') {
      unlockAchievement('darija_explorer');
    }
  }, [unlockAchievement]);



  const value = React.useMemo(() => ({
    sourceLang,
    targetLang,
    setSourceLang: setSourceLangState,
    setTargetLang,
    profile,
    updateProfile,
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
    updateNodeProgress,
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
    setTargetLang,
    profile,
    updateProfile,
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
    updateNodeProgress,
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