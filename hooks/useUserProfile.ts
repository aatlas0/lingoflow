
import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { UserProfile, Achievement, Mistake } from '../types';
import { XP_PER_LEVEL, ACHIEVEMENTS } from '../constants/achievements';

const initialProfile: UserProfile = {
  level: 1,
  xp: 0,
  highScore: 0,
  quizzesCompleted: 0,
  streak: 0,
  immersionScore: 0,
  unlockedAchievements: [],
  mistakes: [],
  completedSubLessons: [],
};

export const useUserProfile = () => {
  const [profile, setProfile] = useLocalStorage<UserProfile>('userProfile', initialProfile);

  const addXp = useCallback((amount: number): string[] => {
    const newAchievements: string[] = [];
    setProfile(prevProfile => {
      const newXp = prevProfile.xp + amount;
      const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

      if (newLevel > prevProfile.level && !prevProfile.unlockedAchievements.includes(`level_${newLevel}`)) {
        if (ACHIEVEMENTS[`level_${newLevel}`]) {
          newAchievements.push(`level_${newLevel}`);
        }
      }

      // Check for level 5 achievement specifically
      if (newLevel >= 5 && !prevProfile.unlockedAchievements.includes('level_5')) {
        newAchievements.push('level_5');
      }

      return {
        ...prevProfile,
        xp: newXp,
        level: newLevel,
        unlockedAchievements: [...prevProfile.unlockedAchievements, ...newAchievements],
      };
    });
    return newAchievements;
  }, [setProfile]);

  const completeQuiz = useCallback(() => {
    const newAchievements: string[] = [];
    setProfile(prevProfile => {
      if (!prevProfile.unlockedAchievements.includes('first_quiz')) {
        newAchievements.push('first_quiz');
      }
      return {
        ...prevProfile,
        quizzesCompleted: prevProfile.quizzesCompleted + 1,
        unlockedAchievements: [...prevProfile.unlockedAchievements, ...newAchievements],
      };
    });
    return newAchievements;
  }, [setProfile]);

  const updateHighScore = useCallback((score: number): string[] => {
    const newAchievements: string[] = [];
    setProfile(prevProfile => {
      if (score > prevProfile.highScore) {
        // Fix: Persist unlocked achievements to the profile state, not just the return value.
        const updatedAchievements = [...prevProfile.unlockedAchievements];
        if (score >= 10 && !prevProfile.unlockedAchievements.includes('high_score_10')) {
          newAchievements.push('high_score_10');
          updatedAchievements.push('high_score_10');
        }
        return { ...prevProfile, highScore: score, unlockedAchievements: updatedAchievements };
      }
      return prevProfile;
    });
    return newAchievements;
  }, [setProfile]);

  const unlockAchievement = useCallback((achievementId: string): string[] => {
    let unlocked = false;
    setProfile(prevProfile => {
      if (!prevProfile.unlockedAchievements.includes(achievementId)) {
        unlocked = true;
        return {
          ...prevProfile,
          unlockedAchievements: [...prevProfile.unlockedAchievements, achievementId]
        };
      }
      return prevProfile;
    });
    return unlocked ? [achievementId] : [];
  }, [setProfile]);

  const addMistake = useCallback((mistake: Mistake) => {
    setProfile(prev => ({
      ...prev,
      mistakes: [mistake, ...(prev.mistakes || [])].slice(0, 50) // Keep last 50 mistakes
    }));
  }, [setProfile]);

  const completeSubLesson = useCallback((subLessonId: string) => {
    setProfile(prev => {
      if (prev.completedSubLessons.includes(subLessonId)) {
        return prev; // Already completed
      }
      return {
        ...prev,
        completedSubLessons: [...prev.completedSubLessons, subLessonId]
      };
    });
  }, [setProfile]);

  return { profile, setProfile, addXp, completeQuiz, updateHighScore, unlockAchievement, addMistake, completeSubLesson };
};
