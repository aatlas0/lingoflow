# LingoFlow 🗺️

AI-powered, gamified language learning app. Every quiz, chat, skill tree, and adventure map is generated on the fly by the Google Gemini API — with first-class support for **Moroccan Darija** (dual Arabic/Latin script).

## Features

- **Quizzes** — level-aware daily quizzes, lightning rounds, and quizzes generated from your own past mistakes
- **Immersion Chat** — an AI tutor that only speaks the target language, plays dumb on your mistakes, and corrects you silently in a side panel
- **Saga Map** — a fantasy RPG world map where each city is a learning milestone with AI-generated roleplay episodes
- **Skill Tree & Training Grounds** — a generated curriculum broken into bite-sized sub-lessons
- **Gamification** — XP, levels, streaks, achievements, daily quests
- **Immersion slider** — gradually swaps the UI itself into your target language as you level up

## Tech Stack

- React 19 + TypeScript + Vite
- Google Gemini API (`@google/genai`) — `gemini-2.5-flash` / `gemini-2.5-pro` with structured JSON output
- Tailwind CSS (CDN)
- Browser Web Speech API for text-to-speech
- Supabase (Auth + Postgres) — username/password accounts, progress synced per user

## Getting Started

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Gemini API key and Supabase project credentials (see `.env.example` for the variable names).
3. Run the dev server:
   ```bash
   npm run dev
   ```
   The app runs at http://localhost:3000.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel — the Vite preset is auto-detected (`npm run build` → `dist/`). No `vercel.json` needed.
2. Add the environment variables in Vercel → Project Settings → Environment Variables:
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

> ⚠️ **Security note:** this is a pure client-side app — the Gemini key is embedded in the JavaScript bundle at build time and visible to anyone who opens DevTools. Before sharing the deployment publicly, either restrict the key (Google Cloud Console → API key restrictions) or move Gemini calls behind a serverless function.

## Supabase

The app requires an account: users sign up with a **username + password** (mapped internally to a synthetic `username@lingoflow.com` email). Progress (XP, level, achievements, mistakes) and AI-generated content (skill trees, saga maps — stored per target language) sync to Postgres automatically and follow the user across devices.

Setup for a fresh Supabase project:

1. Run `supabase/schema.sql` in the SQL Editor (creates `profiles` + `language_state` with RLS)
2. Disable email confirmation: Authentication → Sign In / Providers → Email → "Confirm email" OFF
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) locally and in Vercel

Only the **publishable/anon** key belongs in this app — never the `service_role` key.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
