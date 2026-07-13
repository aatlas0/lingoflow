import type {
  CefrLevel,
  SelfAssessedLevel,
  PlacementSkill,
  SkillScores,
  TopicStat,
} from '../types';

export const CEFR_LADDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

// Which CEFR bands a test probes, centered on the learner's own estimate.
// 21 MCQs split evenly across the bands keeps each band statistically usable.
export const BANDS_FOR_SELF_ASSESSED: Record<SelfAssessedLevel, CefrLevel[]> = {
  new: ['A1', 'A2', 'B1'],
  elementary: ['A1', 'A2', 'B1', 'B2'],
  intermediate: ['A2', 'B1', 'B2', 'C1'],
  advanced: ['B1', 'B2', 'C1'],
};

export const MCQ_COUNT = 21;
export const WRITING_COUNT = 3;

// A band counts as "passed" at 60%+ accuracy.
const PASS_THRESHOLD = 0.6;

export interface McqResult {
  skill: PlacementSkill;
  cefr: CefrLevel;
  isCorrect: boolean;
}

const bandBelow = (band: CefrLevel): CefrLevel => {
  const i = CEFR_LADDER.indexOf(band);
  return i > 0 ? CEFR_LADDER[i - 1] : 'A1';
};

/**
 * Climb the ladder of tested bands: the result is the highest consecutive
 * band the learner passes. Bands below the tested range are assumed passed
 * (the self-assessment already vouched for them); failing even the lowest
 * tested band lands one band below it.
 */
export const scoreMcq = (results: McqResult[], testedBands: CefrLevel[]): CefrLevel => {
  const ordered = CEFR_LADDER.filter(b => testedBands.includes(b));
  if (ordered.length === 0 || results.length === 0) return 'A1';

  let level: CefrLevel | null = null;
  for (const band of ordered) {
    const inBand = results.filter(r => r.cefr === band);
    // A band the generator skipped shouldn't block the climb.
    if (inBand.length === 0) continue;
    const accuracy = inBand.filter(r => r.isCorrect).length / inBand.length;
    if (accuracy >= PASS_THRESHOLD) {
      level = band;
    } else {
      break;
    }
  }
  return level ?? bandBelow(ordered[0]);
};

/**
 * Writing acts as a sanity check on the MCQ estimate: multiple-choice can be
 * lucky, free production can't. Very weak writing (avg < 1.5/5) pulls the
 * final level down one band; it never pushes it up (AI grading is too noisy
 * to promote on).
 */
export const finalCefr = (mcqCefr: CefrLevel, writingAvg: number | null): CefrLevel => {
  if (writingAvg !== null && writingAvg < 1.5 && mcqCefr !== 'A1') {
    return bandBelow(mcqCefr);
  }
  return mcqCefr;
};

export const computeSkillScores = (results: McqResult[], writingAvg: number | null): SkillScores => {
  const pct = (skill: PlacementSkill): number => {
    const inSkill = results.filter(r => r.skill === skill);
    if (inSkill.length === 0) return 0;
    return Math.round((inSkill.filter(r => r.isCorrect).length / inSkill.length) * 100);
  };
  return {
    vocabulary: pct('vocabulary'),
    grammar: pct('grammar'),
    reading: pct('reading'),
    writing: writingAvg === null ? 0 : Math.round((writingAvg / 5) * 100),
  };
};

// Starting XP level per CEFR band — capped at 5 so even advanced learners
// keep headroom in the 20-level progression.
export const CEFR_TO_START_LEVEL: Record<CefrLevel, number> = {
  A1: 1, A2: 2, B1: 3, B2: 4, C1: 5,
};

export const CEFR_LABELS: Record<CefrLevel, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
};

// --- Adaptive topic tracking ---

const TOPIC_STATS_CAP = 30;
const MIN_SAMPLES = 3;
const WEAK_BELOW = 0.6;
const STRONG_FROM = 0.85;
const AREAS_CAP = 6;

const normalizeTopic = (topic: string): string => topic.trim().toLowerCase();

/**
 * Merge a quiz's per-topic outcomes into the rolling stats. Updated topics
 * move to the front; the list is capped so ancient topics age out.
 */
export const updateTopicStats = (
  stats: TopicStat[],
  outcomes: { topic: string; correct: number; total: number }[]
): TopicStat[] => {
  const next = [...stats];
  for (const o of outcomes) {
    const topic = normalizeTopic(o.topic);
    if (!topic || o.total <= 0) continue;
    const i = next.findIndex(s => s.topic === topic);
    const prev = i >= 0 ? next.splice(i, 1)[0] : { topic, correct: 0, total: 0 };
    next.unshift({ topic, correct: prev.correct + o.correct, total: prev.total + o.total });
  }
  return next.slice(0, TOPIC_STATS_CAP);
};

/** Topics with enough samples split into weak (<60%) and strong (≥85%). */
export const deriveAreas = (stats: TopicStat[]): { weakAreas: string[]; strongAreas: string[] } => {
  const weakAreas: string[] = [];
  const strongAreas: string[] = [];
  for (const s of stats) {
    if (s.total < MIN_SAMPLES) continue;
    const accuracy = s.correct / s.total;
    if (accuracy < WEAK_BELOW && weakAreas.length < AREAS_CAP) weakAreas.push(s.topic);
    else if (accuracy >= STRONG_FROM && strongAreas.length < AREAS_CAP) strongAreas.push(s.topic);
  }
  return { weakAreas, strongAreas };
};
