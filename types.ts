
export interface Language {
  code: string;
  name: string;
  isSpecial?: boolean; // For Darija
}

export interface DarijaText {
  arabic: string;
  latin: string;
}

export type QuizText = string | DarijaText;

export interface QuizQuestion {
  question: QuizText;
  options: QuizText[];
  correctAnswer: QuizText;
  explanation?: string;
}

export interface UserAnswer {
  question: QuizQuestion;
  selectedAnswer: QuizText;
  isCorrect: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Mistake {
  original: string;
  correction: string;
  explanation: string;
  timestamp: number;
  context?: string;
}

export interface UserProfile {
  // --- Per-language progress: swapped in/out when the target language changes ---
  level: number;
  xp: number;
  highScore: number;
  quizzesCompleted: number;
  immersionScore: number; // 0-100
  mistakes: Mistake[];
  completedSubLessons: string[]; // Array of SubLesson IDs
  placementDone?: boolean; // placement test taken for this language
  // --- Account-global: identity, habit, trophies ---
  streak: number;
  lastActiveDate: string | null; // local 'YYYY-MM-DD' of the last day with activity
  unlockedAchievements: string[];
  sourceLangCode: string | null; // persisted language pair
  targetLangCode: string | null;
}

// The per-language slice of UserProfile, stored per (user, target language).
export interface LanguageProgress {
  level: number;
  xp: number;
  highScore: number;
  quizzesCompleted: number;
  immersionScore: number;
  mistakes: Mistake[];
  completedSubLessons: string[];
  placementDone?: boolean;
}

export interface CulturalNugget {
  title: string;
  text: string;
  tags: string[];
  context: 'quiz' | 'chat' | 'both';
}

export interface ChatMessage {
  role: 'user' | 'model' | 'nugget';
  content: string | DarijaText | CulturalNugget;
  timestamp: number;
}

export type NodeState = 'locked' | 'mirage' | 'anchored' | 'inked' | 'ruined';

export interface SkillNode {
  id: string; // Unique identifier (can be node_name for now)
  node_name: string;
  level: number;
  objective: string;
  type: 'vocabulary' | 'grammar' | 'conversation' | 'culture';
  content_examples: string[];
  difficulty: number;
  state: NodeState;
  saturation: number; // 0-100
  lastPracticed: number; // timestamp
}

export interface SkillBranch {
  branch: string;
  required_level: number;
  nodes: SkillNode[];
}

export interface SkillTree {
  skill_tree: SkillBranch[];
}

// Training Grounds - Sub-lesson System
export interface SubLesson {
  id: string;
  parentSkillId: string; // Links to SkillNode.id
  title: string;
  description: string;
  difficulty: 1 | 2 | 3; // 1=Easy, 2=Medium, 3=Hard
  questionCount: number; // 5-20 questions
  status: 'locked' | 'available' | 'completed';
  topics: string[]; // Specific topics covered in this sub-lesson
  order: number; // Sequential order within parent skill
}

export interface TrainingCategory {
  id: string;
  name: string;
  icon: string; // Emoji or icon identifier
  description: string;
  progress: number; // 0-100 percentage
  subLessons: SubLesson[];
  status: 'locked' | 'in_progress' | 'mastered';
}


export type AppView = 'home' | 'dashboard' | 'quiz' | 'lightning' | 'chat' | 'profile' | 'sagaMap' | 'training' | 'practiceQuiz' | 'placement';

export type QuestType = 'quiz_complete' | 'xp_earn' | 'chat_message';

export interface Quest {
  id: string;
  type: QuestType;
  description: string;
  target: number;
  progress: number;
  rewardXP: number;
  isClaimed: boolean;
}

// Saga Map Types
export type MapNodeType = 'city' | 'waypoint' | 'boss';
export type MapNodeStatus = 'locked' | 'available' | 'completed' | 'perfect';
export type MapBiome = 'forest' | 'desert' | 'mountain';

export interface SagaMap {
  nodes: MapNode[];
  currentBiome: MapBiome;
  userPosition: string; // ID of the node the user is currently at
}

// Episode & Scenario Types (Replacing SubLesson/CityEpisode)

export type ScenarioType = 'dialogue' | 'negotiation' | 'investigation' | 'puzzle' | 'combat';
export type ScenarioStatus = 'locked' | 'active' | 'completed' | 'failed';

export interface Scenario {
  id: string;
  title: string;
  type: ScenarioType;
  status: ScenarioStatus;
  description: string; // Brief description of the problem
  objective: string; // What the user needs to achieve

  // Requirements to unlock/play this scenario effectively
  required_skills?: {
    nodeId: string; // ID from SkillTree
    level: number;
  }[];

  content: any; // Flexible content (dialogue tree, puzzle data, etc.)
  rewards?: {
    xp: number;
    items?: string[];
  };

  // Roleplay Data
  opening_line?: string; // What the NPC says first
  character_role?: string; // Name/Role of the NPC (e.g. "The Guard")
  situation?: string; // Context for the header (e.g. "You are trying to enter...")
  disposition?: 'friendly' | 'neutral' | 'hostile'; // NPC's attitude
}

export interface Episode {
  id: string;
  nodeId: string; // Links to the MapNode
  title: string;
  intro_narrative: string; // The "Hook"
  how_to_play: string; // Instructions on how to play the episode
  scenarios: Scenario[]; // List of problems to solve

  // Episode-level status
  is_completed: boolean;
  unlocked_at: number; // Timestamp
}

// Update MapNode to potentially link to an Episode
export interface MapNode {
  id: string;
  type: MapNodeType;
  status: MapNodeStatus;
  position: { x: number; y: number }; // 0-100 coordinates
  biome: MapBiome;

  // Content
  title: string; // Default/Target
  titleNative: string; // Native Language
  description: string;
  descriptionNative?: string; // Optional native description
  level: number; // Required user level

  // For Cities/Bosses
  episodeId?: string; // Link to the Episode data
  topics?: string[]; // Topics covered (legacy/fallback)

  // For Waypoints
  quizData?: any; // Pre-generated quiz or reference
}
