-- Per-language progress + streak/language-pair columns.
-- Run this in the Supabase SQL Editor. Safe to run multiple times.
-- (Supersedes 20260712_streak_and_langs.sql — includes its changes.)

alter table public.profiles
  add column if not exists last_active_date text,
  add column if not exists source_lang text,
  add column if not exists target_lang text;

-- Level, XP, mistakes, lessons etc. now live per (user, target language).
alter table public.language_state
  add column if not exists progress jsonb;

-- One-time adoption: accounts that accumulated progress before this change
-- keep it under the language they were last learning ('es' was the default).
insert into public.language_state (user_id, target_lang, progress)
select
  user_id,
  coalesce(target_lang, 'es'),
  jsonb_build_object(
    'level', level,
    'xp', xp,
    'highScore', high_score,
    'quizzesCompleted', quizzes_completed,
    'immersionScore', immersion_score,
    'mistakes', mistakes,
    'completedSubLessons', completed_sub_lessons
  )
from public.profiles
where xp > 0 or quizzes_completed > 0
on conflict (user_id, target_lang) do update
  set progress = excluded.progress
  where public.language_state.progress is null;
