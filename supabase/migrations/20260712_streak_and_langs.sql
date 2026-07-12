-- Adds streak tracking and language-pair persistence to profiles.
-- Run this in the Supabase SQL Editor (safe to run multiple times).

alter table public.profiles
  add column if not exists last_active_date text,
  add column if not exists source_lang text,
  add column if not exists target_lang text;
