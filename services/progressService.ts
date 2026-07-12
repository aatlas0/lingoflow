import { getSupabase } from './supabaseClient';
import type { UserProfile, SkillTree, SagaMap } from '../types';

// Maps between the app's camelCase UserProfile and the snake_case profiles table.

export const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    level: data.level,
    xp: data.xp,
    highScore: data.high_score,
    quizzesCompleted: data.quizzes_completed,
    streak: data.streak,
    lastActiveDate: data.last_active_date ?? null,
    immersionScore: data.immersion_score,
    unlockedAchievements: data.unlocked_achievements ?? [],
    mistakes: data.mistakes ?? [],
    completedSubLessons: data.completed_sub_lessons ?? [],
    sourceLangCode: data.source_lang ?? null,
    targetLangCode: data.target_lang ?? null,
  };
};

export const saveProfile = async (userId: string, username: string | null, profile: UserProfile): Promise<void> => {
  const basePayload = {
    user_id: userId,
    username,
    level: profile.level,
    xp: profile.xp,
    high_score: profile.highScore,
    quizzes_completed: profile.quizzesCompleted,
    streak: profile.streak,
    immersion_score: profile.immersionScore,
    unlocked_achievements: profile.unlockedAchievements,
    mistakes: profile.mistakes,
    completed_sub_lessons: profile.completedSubLessons,
    updated_at: new Date().toISOString(),
  };

  let { error } = await getSupabase().from('profiles').upsert({
    ...basePayload,
    last_active_date: profile.lastActiveDate,
    source_lang: profile.sourceLangCode,
    target_lang: profile.targetLangCode,
  });

  // Older databases don't have the newer columns yet — save what we can.
  if (error && /column|schema cache/i.test(error.message)) {
    console.warn(
      'profiles table is missing newer columns; run supabase/migrations/20260712_streak_and_langs.sql. Saving legacy fields only.'
    );
    ({ error } = await getSupabase().from('profiles').upsert(basePayload));
  }

  if (error) console.error('Failed to save profile:', error.message);
};

export interface LanguageState {
  skillTree: SkillTree | null;
  sagaMap: SagaMap | null;
}

export const fetchLanguageState = async (userId: string, targetLang: string): Promise<LanguageState> => {
  const { data, error } = await getSupabase()
    .from('language_state')
    .select('skill_tree, saga_map')
    .eq('user_id', userId)
    .eq('target_lang', targetLang)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch language state:', error.message);
    return { skillTree: null, sagaMap: null };
  }

  return {
    skillTree: (data?.skill_tree as SkillTree) ?? null,
    sagaMap: (data?.saga_map as SagaMap) ?? null,
  };
};

export const saveLanguageState = async (
  userId: string,
  targetLang: string,
  skillTree: SkillTree | null,
  sagaMap: SagaMap | null
): Promise<void> => {
  const { error } = await getSupabase().from('language_state').upsert({
    user_id: userId,
    target_lang: targetLang,
    skill_tree: skillTree,
    saga_map: sagaMap,
    updated_at: new Date().toISOString(),
  });

  if (error) console.error('Failed to save language state:', error.message);
};
