// Cache for expensive AI-generated content (episodes, sub-lessons) so
// revisiting a node or category doesn't re-bill a Gemini call. Keys embed the
// target language plus enough of the source content (node/branch identity) to
// invalidate naturally when the underlying map or tree is regenerated.

export const readAiCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeAiCache = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — worst case we regenerate next time.
  }
};

export const clearAiCacheForLanguage = (langCode: string): void => {
  try {
    const prefixes = [`sagaEpisode-${langCode}-`, `subLessons-${langCode}-`];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && prefixes.some(p => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
};
