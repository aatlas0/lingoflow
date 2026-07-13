-- LingoFlow database schema
-- Run this in the Supabase SQL Editor (or let the agent apply it via MCP).

-- ============================================================
-- profiles: one row per user, mirrors the app's UserProfile
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  level int not null default 1,
  xp int not null default 0,
  high_score int not null default 0,
  quizzes_completed int not null default 0,
  streak int not null default 0,
  last_active_date text, -- local 'YYYY-MM-DD' of the last day with activity
  immersion_score int not null default 0,
  unlocked_achievements jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  completed_sub_lessons jsonb not null default '[]'::jsonb,
  source_lang text, -- persisted language pair
  target_lang text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================
-- language_state: AI-generated content (skill tree, saga map)
-- stored per user per target language
-- ============================================================
create table if not exists public.language_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_lang text not null,
  skill_tree jsonb,
  saga_map jsonb,
  progress jsonb, -- per-language level/xp/mistakes/lessons (LanguageProgress)
  updated_at timestamptz not null default now(),
  primary key (user_id, target_lang)
);

alter table public.language_state enable row level security;

create policy "Users can read own language state"
  on public.language_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own language state"
  on public.language_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own language state"
  on public.language_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own language state"
  on public.language_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);
