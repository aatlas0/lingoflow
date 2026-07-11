# LingoAtlas 🗺️

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
- All user data stored in `localStorage` (no backend yet)

## Getting Started

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set your Gemini API key:
   ```bash
   GEMINI_API_KEY=your-key-here
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
   The app runs at http://localhost:3000.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel — the Vite preset is auto-detected (`npm run build` → `dist/`). No `vercel.json` needed.
2. Add the environment variable in Vercel → Project Settings → Environment Variables:
   - `GEMINI_API_KEY`

> ⚠️ **Security note:** this is a pure client-side app — the Gemini key is embedded in the JavaScript bundle at build time and visible to anyone who opens DevTools. Before sharing the deployment publicly, either restrict the key (Google Cloud Console → API key restrictions) or move Gemini calls behind a serverless function.

## Supabase (planned)

Supabase integration (auth + syncing profiles/progress across devices) is planned but not wired up yet. When adding it:

1. `npm install @supabase/supabase-js`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) locally and in Vercel
3. Use only the **publishable/anon** key in this app — never the `service_role` key
4. Enable RLS on every table exposed through the Data API

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
