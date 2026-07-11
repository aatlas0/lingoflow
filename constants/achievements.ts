
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
};