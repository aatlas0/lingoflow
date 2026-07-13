
import type { Language } from '../types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Mandarin Chinese' },
  { code: 'ar', name: 'Arabic (Standard)' },
  { code: 'ary', name: 'Moroccan Darija', isSpecial: true },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ur', name: 'Urdu' },
  { code: 'id', name: 'Indonesian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'da', name: 'Danish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
  { code: 'he', name: 'Hebrew' },
  { code: 'el', name: 'Greek' },
  { code: 'uk', name: 'Ukrainian' },
];

// Flag emoji per language code — languages are first-class identities in the
// UI (header chip, My Languages hub, dashboard title).
export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹',
  ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', ar: '🇸🇦', ary: '🇲🇦',
  hi: '🇮🇳', bn: '🇧🇩', ur: '🇵🇰', id: '🇮🇩', tr: '🇹🇷', nl: '🇳🇱',
  da: '🇩🇰', sv: '🇸🇪', pl: '🇵🇱', he: '🇮🇱', el: '🇬🇷', uk: '🇺🇦',
};

export const flagOf = (code: string): string => LANGUAGE_FLAGS[code] ?? '🌐';