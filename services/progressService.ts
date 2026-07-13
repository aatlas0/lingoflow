import { getSupabase } from './supabaseClient';
import type { UserProfile, SkillTree, SagaMap, LanguageProgress } from '../types';

// Maps between the app's camelCase UserProfile and the snake_case profiles table.

// A brand-new language starts here.
export const FRESH_LANGUAGE_PROGRESS: LanguageProgress = {
  level: 1,
  xp: 0,
  highScore: 0,
  quizzesCompleted: 0,
  immersionScore: 0,
  mistakes: [],
  completedSubLessons: [],
  placementDone: false,
};

// The per-language slice of the profile, as stored in language_state.progress.
export const extractProgress = (p: UserProfile): LanguageProgress => ({
  level: p.level,
  xp: p.xp,
  highScore: p.highScore,
  quizzesCompleted: p.quizzesCompleted,
  immersionScore: p.immersionScore,
  mistakes: p.mistakes,
  completedSubLessons: p.completedSubLessons,
  placementDone: p.placementDone ?? false,
});

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
  progress: LanguageProgress | null;
}

export const fetchLanguageState = async (userId: string, targetLang: string): Promise<LanguageState> => {
  // select('*') so databases without the newer progress column still work
  const { data, error } = await getSupabase()
    .from('language_state')
    .select('*')
    .eq('user_id', userId)
    .eq('target_lang', targetLang)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch language state:', error.message);
    return { skillTree: null, sagaMap: null, progress: null };
  }

  return {
    skillTree: (data?.skill_tree as SkillTree) ?? null,
    sagaMap: (data?.saga_map as SagaMap) ?? null,
    progress: (data?.progress as LanguageProgress) ?? null,
  };
};

export interface LanguageProgressSummary {
  langCode: string;
  progress: LanguageProgress;
}

// Every language this account has started, with its own saved progress —
// powers the My Languages hub and the profile's per-language strip.
export const fetchAllLanguageProgress = async (userId: string): Promise<LanguageProgressSummary[]> => {
  const { data, error } = await getSupabase()
    .from('language_state')
    .select('target_lang, progress')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch language summaries:', error.message);
    return [];
  }

  return (data ?? []).map(row => ({
    langCode: row.target_lang as string,
    progress: (row.progress as LanguageProgress) ?? FRESH_LANGUAGE_PROGRESS,
  }));
};

export const saveLanguageState = async (
  userId: string,
  targetLang: string,
  skillTree: SkillTree | null,
  sagaMap: SagaMap | null,
  progress: LanguageProgress | null = null
): Promise<void> => {
  const basePayload = {
    user_id: userId,
    target_lang: targetLang,
    skill_tree: skillTree,
    saga_map: sagaMap,
    updated_at: new Date().toISOString(),
  };

  let { error } = await getSupabase().from('language_state').upsert({
    ...basePayload,
    progress,
  });

  // Older databases don't have the progress column yet — save what we can.
  if (error && /column|schema cache/i.test(error.message)) {
    console.warn(
      'language_state table is missing the progress column; run supabase/migrations/20260712_per_language_progress.sql. Saving trees only.'
    );
    ({ error } = await getSupabase().from('language_state').upsert(basePayload));
  }

  if (error) console.error('Failed to save language state:', error.message);
};
