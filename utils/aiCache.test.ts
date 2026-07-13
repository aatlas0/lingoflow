import { describe, it, expect, beforeEach } from 'vitest';
import { readAiCache, writeAiCache, clearAiCacheForLanguage } from './aiCache';

describe('aiCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a value', () => {
    writeAiCache('sagaEpisode-fr-n1-Paris', { title: 'Bienvenue' });
    expect(readAiCache('sagaEpisode-fr-n1-Paris')).toEqual({ title: 'Bienvenue' });
  });

  it('returns null for a missing key', () => {
    expect(readAiCache('nope')).toBeNull();
  });

  it('returns null instead of throwing on corrupt JSON', () => {
    localStorage.setItem('bad', '{not json');
    expect(readAiCache('bad')).toBeNull();
  });

  it('clears only the given language, both prefixes', () => {
    writeAiCache('sagaEpisode-fr-n1-Paris', 1);
    writeAiCache('subLessons-fr-Grammar-Basics', 2);
    writeAiCache('sagaEpisode-es-n1-Madrid', 3);
    writeAiCache('recentQuestions-fr', 4); // not an AI-cache prefix

    clearAiCacheForLanguage('fr');

    expect(readAiCache('sagaEpisode-fr-n1-Paris')).toBeNull();
    expect(readAiCache('subLessons-fr-Grammar-Basics')).toBeNull();
    expect(readAiCache('sagaEpisode-es-n1-Madrid')).toBe(3);
    expect(readAiCache('recentQuestions-fr')).toBe(4);
  });
});
