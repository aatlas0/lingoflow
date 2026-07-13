import { describe, it, expect } from 'vitest';
import {
  scoreMcq,
  finalCefr,
  computeSkillScores,
  updateTopicStats,
  deriveAreas,
  BANDS_FOR_SELF_ASSESSED,
  type McqResult,
} from './placement';
import type { CefrLevel, PlacementSkill } from '../types';

const make = (cefr: CefrLevel, correct: number, total: number, skill: PlacementSkill = 'vocabulary'): McqResult[] =>
  Array.from({ length: total }, (_, i) => ({ skill, cefr, isCorrect: i < correct }));

describe('scoreMcq', () => {
  it('climbs bands while accuracy is >= 60%', () => {
    const results = [
      ...make('A1', 5, 5),
      ...make('A2', 4, 5), // 80% pass
      ...make('B1', 2, 5), // 40% fail
    ];
    expect(scoreMcq(results, ['A1', 'A2', 'B1'])).toBe('A2');
  });

  it('passing every tested band yields the top band', () => {
    const results = [...make('B1', 5, 5), ...make('B2', 4, 5), ...make('C1', 3, 5)];
    expect(scoreMcq(results, BANDS_FOR_SELF_ASSESSED.advanced)).toBe('C1');
  });

  it('failing the lowest tested band drops one below it', () => {
    const results = [...make('A2', 1, 5), ...make('B1', 0, 5)];
    expect(scoreMcq(results, BANDS_FOR_SELF_ASSESSED.intermediate)).toBe('A1');
  });

  it('failing A1 as the lowest band still yields A1', () => {
    const results = make('A1', 0, 5);
    expect(scoreMcq(results, ['A1', 'A2'])).toBe('A1');
  });

  it('a band with no questions does not block the climb', () => {
    const results = [...make('A1', 5, 5), ...make('B1', 5, 5)];
    expect(scoreMcq(results, ['A1', 'A2', 'B1'])).toBe('B1');
  });

  it('does not skip past a failed band even if a higher one passes', () => {
    const results = [...make('A1', 5, 5), ...make('A2', 0, 5), ...make('B1', 5, 5)];
    expect(scoreMcq(results, ['A1', 'A2', 'B1'])).toBe('A1');
  });
});

describe('finalCefr', () => {
  it('keeps the MCQ level when writing is fine', () => {
    expect(finalCefr('B1', 3.5)).toBe('B1');
  });
  it('drops one band on very weak writing', () => {
    expect(finalCefr('B1', 1)).toBe('A2');
  });
  it('never drops below A1 and never promotes', () => {
    expect(finalCefr('A1', 0)).toBe('A1');
    expect(finalCefr('B1', 5)).toBe('B1');
  });
  it('ignores writing when none was graded', () => {
    expect(finalCefr('B2', null)).toBe('B2');
  });
});

describe('computeSkillScores', () => {
  it('computes per-skill percentages and scales writing to 100', () => {
    const results: McqResult[] = [
      ...make('A1', 4, 5, 'vocabulary'),
      ...make('A1', 2, 4, 'grammar'),
      ...make('A1', 3, 3, 'reading'),
    ];
    expect(computeSkillScores(results, 4)).toEqual({
      vocabulary: 80,
      grammar: 50,
      reading: 100,
      writing: 80,
    });
  });
});

describe('topic stats', () => {
  it('accumulates outcomes and moves updated topics to the front', () => {
    let stats = updateTopicStats([], [{ topic: 'Past Tense', correct: 1, total: 2 }]);
    stats = updateTopicStats(stats, [
      { topic: 'food vocabulary', correct: 3, total: 3 },
      { topic: 'past tense', correct: 0, total: 2 },
    ]);
    expect(stats[0]).toEqual({ topic: 'past tense', correct: 1, total: 4 });
    expect(stats[1]).toEqual({ topic: 'food vocabulary', correct: 3, total: 3 });
  });

  it('derives weak and strong areas only with enough samples', () => {
    const { weakAreas, strongAreas } = deriveAreas([
      { topic: 'past tense', correct: 1, total: 4 }, // 25% weak
      { topic: 'food vocabulary', correct: 3, total: 3 }, // 100% strong
      { topic: 'articles', correct: 0, total: 2 }, // too few samples
    ]);
    expect(weakAreas).toEqual(['past tense']);
    expect(strongAreas).toEqual(['food vocabulary']);
    expect(weakAreas).not.toContain('articles');
  });
});
