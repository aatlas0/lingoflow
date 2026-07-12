
import type { Achievement } from '../types';

export const XP_PER_LEVEL = 1000;
export const XP_GAINS = {
  QUIZ_CORRECT: 50,
  LIGHTNING_CORRECT: 75,
  CHAT_MESSAGE: 10,
};

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_quiz: {
    id: 'first_quiz',
    name: 'First Step',
    description: 'Complete your first quiz.',
    icon: '🎓',
  },
  high_score_10: {
    id: 'high_score_10',
    name: 'Quick Learner',
    description: 'Score 10 or more in a Lightning Round.',
    icon: '⚡️',
  },
  polyglot: {
    id: 'polyglot',
    name: 'Polyglot in Training',
    description: 'Start a chat session with the AI Tutor.',
    icon: '💬',
  },
  level_5: {
    id: 'level_5',
    name: 'Level 5 Linguist',
    description: 'Reach level 5.',
    icon: '🌟',
  },
  darija_explorer: {
    id: 'darija_explorer',
    name: 'Darija Explorer',
    description: 'Learn Moroccan Darija.',
    icon: '🇲🇦',
  },
  streak_3: {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Reach a 3-day streak.',
    icon: '🔥',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week of Flames',
    description: 'Reach a 7-day streak.',
    icon: '🏮',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Unstoppable',
    description: 'Reach a 30-day streak.',
    icon: '🌋',
  },
  placement_complete: {
    id: 'placement_complete',
    name: 'Found Your Level',
    description: 'Complete the placement test.',
    icon: '🎯',
  },
};