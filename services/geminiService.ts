import type { Language, QuizQuestion, DarijaText, SkillTree, CulturalNugget, SkillNode, Mistake, QuizText, SagaMap, MapNode, MapBiome, Episode, Scenario, SubLesson, TrainingCategory, LearnerProfile, SelfAssessedLevel, PlacementTest, PlacementQuestion, PlacementSkill, CefrLevel, WritingPrompt, WritingGrade } from '../types';
import { generateContent } from './geminiProxy';
import { BANDS_FOR_SELF_ASSESSED, CEFR_LADDER, CEFR_LABELS, MCQ_COUNT, WRITING_COUNT } from '../utils/placement';

// Single model for all text generation: flash-lite is ~6x cheaper than flash
// ($0.25/M in, $1.50/M out) and handles this app's structured-JSON workloads.
const TEXT_MODEL = "gemini-3.1-flash-lite";

// JSON-schema type names for responseSchema declarations. Mirrors the SDK's
// Type enum — the SDK itself stays server-side (see api/gemini.ts).
const Type = {
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY',
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
} as const;

// Helper to parse Darija responses which may not be perfect JSON
export const parseDarijaResponse = (text: string): DarijaText => {
  const match = text.match(/([\u0600-\u06FF\s]+)\s*\((.*?)\)/);
  if (match) {
    return { arabic: match[1].trim(), latin: match[2].trim() };
  }
  // Fallback if parsing fails
  return { arabic: text, latin: '(transliteration not available)' };
};

// --- LEARNER CONTEXT ---
// Every generator prepends this block so content tracks the user's placement
// result and live progress instead of a generic "beginner".

export const buildLearnerContext = (lp?: LearnerProfile | null): string => {
  if (!lp) return '';
  const lines = [
    'LEARNER PROFILE (adapt everything you generate to it):',
    `- Proficiency: CEFR ${lp.cefr} (${CEFR_LABELS[lp.cefr]}). Pitch difficulty at this level — not easier, not harder.`,
  ];
  if (lp.interests.length > 0) {
    lines.push(`- Interests: ${lp.interests.join(', ')}. Theme examples, scenarios and stories around these whenever natural.`);
  }
  if (lp.weakAreas.length > 0) {
    lines.push(`- Weak areas: ${lp.weakAreas.join(', ')}. Weave in extra practice on these.`);
  }
  if (lp.strongAreas.length > 0) {
    lines.push(`- Strong areas: ${lp.strongAreas.join(', ')}. Don't over-drill these; use them as stepping stones.`);
  }
  return lines.join('\n');
};

// --- STRICT QUIZ IMPLEMENTATION ---

interface StrictQuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

const getStrictQuizSchema = () => ({
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The question in the native language." },
          choices: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of 4 options in the target language."
          },
          correctIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)." },
          explanation: { type: Type.STRING, description: "Brief explanation in native language (max 25 words)." },
          topic: { type: Type.STRING, description: "1-3 word topic label in English (e.g. 'past tense', 'food vocabulary')." }
        },
        required: ['question', 'choices', 'correctIndex', 'explanation', 'topic']
      }
    }
  },
  required: ['questions']
});

const mapStrictQuestionToQuizQuestion = (q: StrictQuizQuestion, isDarija: boolean): QuizQuestion => {
  const parseText = (text: string): QuizText => {
    if (!isDarija) return text;
    return parseDarijaResponse(text);
  };

  return {
    question: q.question, // Question is always in native language (string)
    options: q.choices.map(parseText),
    correctAnswer: parseText(q.choices[q.correctIndex]),
    explanation: q.explanation,
    topic: q.topic
  };
};

const _generateQuizInternal = async (prompt: string, isDarija: boolean): Promise<QuizQuestion[]> => {
  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getStrictQuizSchema(),
        // Higher temperature = more varied questions; the response schema
        // keeps the JSON structure safe regardless.
        temperature: 0.9,
      },
    });

    const jsonString = response.text.trim();
    const data = JSON.parse(jsonString);
    const strictQuestions: StrictQuizQuestion[] = data.questions || [];

    return strictQuestions.map(q => mapStrictQuestionToQuizQuestion(q, isDarija));

  } catch (error) {
    console.error("Error generating quiz (Strict Mode):", error);
    throw new Error("Failed to generate quiz questions.");
  }
};

const getStrictRules = (sourceLang: Language, targetLang: Language, isDarija: boolean) => `
RULES:
1. The question must be written in ${sourceLang.name}.
2. The four answer choices must be written in ${targetLang.name}.
3. The explanation must also be written in ${sourceLang.name}.
4. Only one correct answer.
5. No invented or misspelled words in ${targetLang.name}.
6. Follow the learner's proficiency level.
7. Output ONLY valid JSON. No markdown, no comments.
${isDarija ? `8. SPECIAL DARIJA RULE: For all Darija text (choices), you MUST provide both Arabic script and Latin transliteration in this exact format: "Arabic (Latin)" e.g., "سلام (salam)".` : ''}

REQUIRED JSON FORMAT:
{
  "questions": [
    {
      "question": "string",
      "choices": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "explanation": "string",
      "topic": "string (1-3 word English label of what the question tests, e.g. 'past tense')"
    }
  ]
}

NOTES:
- Explanation (${sourceLang.name}) max 25 words.
- Keep the JSON structure EXACT.
- Do not add extra fields.
`;

// --- QUESTION VARIETY ---
// The model converges on the same beginner staples when every call uses the
// same static prompt: rotate topic themes per call and tell it which recent
// questions to avoid (remembered per language on this device).

const QUIZ_TOPICS = [
  'greetings & introductions', 'food & dining', 'travel & transport',
  'numbers, time & dates', 'family & relationships', 'shopping & money',
  'weather & seasons', 'directions & places in town', 'work & professions',
  'hobbies & free time', 'colors & descriptions', 'body & health',
  'animals & nature', 'home & daily routines', 'emotions & opinions',
];

const pickQuizTopics = (count = 3): string[] => {
  const pool = [...QUIZ_TOPICS];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked;
};

const RECENT_QUESTIONS_CAP = 30;
const recentQuestionsKey = (langCode: string) => `recentQuestions-${langCode}`;

const getRecentQuestions = (langCode: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(recentQuestionsKey(langCode)) || '[]');
  } catch {
    return [];
  }
};

const recordRecentQuestions = (langCode: string, questions: QuizQuestion[]) => {
  try {
    const texts = questions
      .map(q => (typeof q.question === 'string' ? q.question : q.question.latin))
      .filter(Boolean);
    const merged = [...getRecentQuestions(langCode), ...texts].slice(-RECENT_QUESTIONS_CAP);
    localStorage.setItem(recentQuestionsKey(langCode), JSON.stringify(merged));
  } catch { /* storage unavailable — non-fatal */ }
};

const getAvoidRepeatsClause = (langCode: string): string => {
  const recent = getRecentQuestions(langCode);
  if (recent.length === 0) return '';
  return `
    The user was recently asked the questions below. Do NOT repeat or lightly rephrase any of them — write completely different questions:
    ${recent.map(q => `- ${q}`).join('\n    ')}
  `;
};

// --- EXPORTED FUNCTIONS ---

export const generateQuiz = async (sourceLang: Language, targetLang: Language, userLevel: number = 1, count: number = 5, learnerProfile?: LearnerProfile | null): Promise<QuizQuestion[]> => {
  console.log(`Generating Quiz for Level: ${userLevel} (${count} questions)`);
  const isDarija = targetLang.code === 'ary';

  const prompt = `
    Generate ${count} multiple-choice questions for learning ${targetLang.name}.
    User Level: ${userLevel} (1=Beginner, 20=Advanced).
    ${buildLearnerContext(learnerProfile)}
    Focus themes for THIS quiz: ${pickQuizTopics().join(', ')}.
    Mix question styles: direct translation, fill-in-the-blank sentences, and "how would you say…" situations.
    ${getAvoidRepeatsClause(targetLang.code)}
    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  const questions = await _generateQuizInternal(prompt, isDarija);
  recordRecentQuestions(targetLang.code, questions);
  return questions;
};

const getChatResponseSchema = () => ({
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: "The conversational response to the user." },
    correction: {
      type: Type.OBJECT,
      nullable: true,
      description: "Optional correction if the user made a mistake.",
      properties: {
        original: { type: Type.STRING, description: "The part of the user's message that was incorrect." },
        corrected: { type: Type.STRING, description: "The corrected version." },
        explanation: { type: Type.STRING, description: "A brief explanation of the error." },
      },
      required: ['original', 'corrected', 'explanation']
    }
  },
  required: ['reply']
});

const getDarijaChatSystemInstruction = (sourceLang: Language) => `
You are a friendly Moroccan Darija tutor.
Your student is learning Darija.Engage in a simple, practical conversation.

STRICT IMMERSION RULES:
1. ** Chat Language **: You must ONLY speak in Moroccan Darija(with Latin transliteration). NEVER speak English in the "reply" field.
2. ** Play Dumb on Mistakes **: If the user makes a grammar or vocabulary mistake, DO NOT correct them in the chat.Instead, act confused or ask for clarification in Darija(e.g., "شنو؟ ما فهمتش." - "Shnu? Ma fhemtsh." or "عاود عفاك؟" - "3awed 3afak?").
3. ** Silent Correction **: Provide the correction and explanation ONLY in the "correction" JSON field.

  EXCEPTIONS & NUANCES:
- ** Spelling Flexibility **: Darija has no standard orthography.Be VERY LENIENT with spelling(e.g., "shnu", "chnou", "chnu" are all correct).Do NOT flag these as mistakes.
- ** "I don't understand" **: If the user says "Mafhamtch", "Ma fhemtsh", or similar, this is NOT a mistake.Do NOT play dumb.Instead, rephrase your previous sentence simply or use a synonym in Darija to help them understand.

RESPONSE FORMAT:
You must respond in JSON format with two fields:
1. "reply": Your conversational response in Darija.
   - ** IMPORTANT **: For Darija text, ALWAYS provide both Arabic script and Latin transliteration.Format: "سلام (salam)".
2. "correction": If the user made a mistake, provide a correction object.If no mistake, this should be null.
   - "original": The user's mistake.
  - "corrected": The correct form.
   - "explanation": Brief explanation in ${sourceLang.name}.

Example(User says "Ana mshi" - incorrect grammar):
{
  "reply": "شنو؟ فين غادي؟ (Shnu? Fin ghadi?) - *Pretending not to understand the broken grammar*",
    "correction": {
    "original": "Ana mshi",
      "corrected": "Ana ghadi nmshi",
        "explanation": "You said 'I walk'. To say 'I am going', use the future marker 'ghadi': 'Ana ghadi nmshi'."
  }
}
`;

const getStandardChatSystemInstruction = (sourceLang: Language, targetLang: Language, learnerProfile?: LearnerProfile | null) => `
You are a friendly language tutor for ${targetLang.name}.
${learnerProfile
    ? `${buildLearnerContext(learnerProfile)}
Match your vocabulary and sentence complexity to the student's CEFR level, and steer the conversation toward their interests.`
    : 'Your student is a beginner.'} Engage in a simple, practical conversation in ${targetLang.name}.

STRICT IMMERSION RULES:
1. ** Chat Language **: You must ONLY speak in ${targetLang.name}. NEVER speak English in the "reply" field.
2. ** Play Dumb on Mistakes **: If the user makes a grammar or vocabulary mistake, DO NOT correct them in the chat.Instead, act confused or ask for clarification in ${targetLang.name} (e.g., "I don't understand", "Can you repeat?").
3. ** Silent Correction **: Provide the correction and explanation ONLY in the "correction" JSON field.

RESPONSE FORMAT:
You must respond in JSON format with two fields:
1. "reply": Your conversational response in ${targetLang.name}.
2. "correction": If the user made a mistake, provide a correction object.If no mistake, this should be null.
   - "original": The user's mistake.
  - "corrected": The correct form.
   - "explanation": Brief explanation in ${sourceLang.name}.
`;

// Chat runs over the proxy too: the SDK's Chat object is just sugar around
// generateContent with an accumulated history, so we keep the history here.
export interface ChatSession {
  sendMessage: (args: { message: string }) => Promise<{ text: string }>;
}

export const createChatSession = (sourceLang: Language, targetLang: Language, learnerProfile?: LearnerProfile | null): ChatSession => {
  const systemInstruction = targetLang.code === 'ary'
    ? getDarijaChatSystemInstruction(sourceLang)
    : getStandardChatSystemInstruction(sourceLang, targetLang, learnerProfile);

  const config = {
    systemInstruction,
    temperature: 0.7,
    responseMimeType: "application/json",
    responseSchema: getChatResponseSchema(),
  };
  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  return {
    async sendMessage({ message }) {
      history.push({ role: 'user', parts: [{ text: message }] });
      try {
        const response = await generateContent({ model: TEXT_MODEL, contents: history, config });
        history.push({ role: 'model', parts: [{ text: response.text }] });
        return { text: response.text };
      } catch (error) {
        history.pop(); // failed turn shouldn't poison the history
        throw error;
      }
    },
  };
};



const getNuggetsSchema = () => ({
  type: Type.OBJECT,
  properties: {
    language: { type: Type.STRING },
    nuggets: {
      type: Type.ARRAY,
      description: "An array of 3-5 short cultural insights.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A short, catchy title for the nugget." },
          text: { type: Type.STRING, description: "The cultural insight, maximum 3 sentences." },
          tags: {
            type: Type.ARRAY,
            description: "Keywords like 'culture', 'slang', 'food', 'daily_life'.",
            items: { type: Type.STRING },
          },
          context: { type: Type.STRING, description: "Where to show this: 'quiz', 'chat', or 'both'." },
        },
        required: ['title', 'text', 'tags', 'context'],
      }
    }
  },
  required: ['language', 'nuggets'],
});

const getNuggetsPrompt = (targetLang: Language) => {
  const isDarija = targetLang.code === 'ary';
  return `
You are the Cultural Expert Module for LingoFlow, an app for learning ${targetLang.name}.

Your task is to provide 3 - 5 short, engaging cultural insights(Cultural Nuggets) related to ${targetLang.name}. These insights will be shown to learners to enrich their experience.

  RULES:
1. Each nugget MUST be concise(max 3 sentences).
2. Each nugget must relate to one of these topics: daily culture, customs, humor, idioms, gestures, history's influence on language, food norms, politeness, or slang context.
3. ABSOLUTELY NO stereotyping or sensitive political / religious commentary.Keep it light, fun, and informative.
4. If ${targetLang.name} is spoken in multiple regions(e.g., Spanish in Spain vs.Latin America), briefly mention a key difference.
5. ${isDarija ? `SPECIAL DARIJA RULES: For Moroccan Darija, include dual-script (Arabic + Latin) for any Darija words. For example, "shukran (شكرا)". Cover common interjections and friendly slang.` : ''}
6. Adhere strictly to the JSON output format.
`;
};

export const generateCulturalNuggets = async (targetLang: Language): Promise<CulturalNugget[]> => {
  const prompt = getNuggetsPrompt(targetLang);
  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getNuggetsSchema(),
        temperature: 0.7,
      },
    });

    const jsonString = response.text.trim();
    const nuggetsData = JSON.parse(jsonString);
    return (nuggetsData.nuggets || []) as CulturalNugget[];
  } catch (error) {
    console.error("Error generating cultural nuggets:", error);
    // Return an empty array to prevent the app from crashing.
    return [];
  }
};

const getSkillTreeSchema = () => ({
  type: Type.OBJECT,
  properties: {
    skill_tree: {
      type: Type.ARRAY,
      description: "An array of thematic skill branches for the language learning path.",
      items: {
        type: Type.OBJECT,
        properties: {
          branch: { type: Type.STRING, description: "The name of the skill branch (e.g., 'Greetings & Basics')." },
          required_level: { type: Type.INTEGER, description: "The player level required to start this branch." },
          nodes: {
            type: Type.ARRAY,
            description: "An array of sequential skill nodes within this branch.",
            items: {
              type: Type.OBJECT,
              properties: {
                node_name: { type: Type.STRING, description: "The title of the skill node (e.g., 'First Introductions')." },
                level: { type: Type.INTEGER, description: "The player level required to unlock this specific node." },
                objective: { type: Type.STRING, description: "A short, 1-2 sentence learning goal for this node." },
                type: { type: Type.STRING, description: "The type of lesson, one of: vocabulary, grammar, conversation, culture." },
                content_examples: {
                  type: Type.ARRAY,
                  description: "An array of 5-10 example words or phrases for this node.",
                  items: { type: Type.STRING },
                },
                difficulty: { type: Type.INTEGER, description: "A difficulty rating from 1 (easy) to 5 (hard)." },
              },
              required: ['node_name', 'level', 'objective', 'type', 'content_examples', 'difficulty'],
            },
          },
        },
        required: ['branch', 'required_level', 'nodes'],
      },
    },
  },
  required: ['skill_tree'],
});

const getSkillTreePrompt = (sourceLang: Language, targetLang: Language, userLevel: number, learnerProfile?: LearnerProfile | null) => {
  const isDarija = targetLang.code === 'ary';
  return `
You are an expert AI Language Curriculum Designer for a gamified app called LingoFlow.
Your task is to create a structured and personalized Skill Tree for a ${sourceLang.name} speaker learning ${targetLang.name}.
The user is currently at Level ${userLevel}.
${buildLearnerContext(learnerProfile)}
${learnerProfile ? `Skills the placement test found weak deserve their own early nodes; content_examples should draw on the learner's interests where the topic allows.` : ''}

RULES:
1.  The curriculum must be structured as a "Skill Tree" with thematic "Skill Branches"(e.g., "Greetings & Basics", "Food & Dining").
2.  Each branch must contain a sequence of "Skill Nodes" that unlock as the user levels up.The user's current level is ${userLevel}, so content should be relevant up to and slightly beyond this level, progressing logically from Level 1 up to Level 20. Create a reasonable number of branches and nodes to cover this range.
3.  Each Skill Node must contain:
- A clear "node_name".
    - The "level" required to unlock it.
    - A concise "objective"(1 - 2 sentences).
    - A "type" from this exact list: 'vocabulary', 'grammar', 'conversation', 'culture'.
    - A list of 5 - 10 "content_examples"(words or phrases).
    - A "difficulty" rating from 1(easiest) to 5(hardest).
4.  The content must be suitable for beginners(A1 / A2 CEFR) at low levels and logically progress towards intermediate(B1 / B2) by Level 20.
5.  ${isDarija ? 'IMPORTANT: Since the target language is Moroccan Darija, you MUST include a special branch called "Slang and Informal Expressions" with relevant colloquial content.' : ''}

Provide the output ONLY in the specified JSON format.
`;
};


export const generateSkillTree = async (sourceLang: Language, targetLang: Language, userLevel: number, learnerProfile?: LearnerProfile | null): Promise<SkillTree> => {
  const prompt = getSkillTreePrompt(sourceLang, targetLang, userLevel, learnerProfile);

  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getSkillTreeSchema(),
        temperature: 0.5,
      },
    });

    const jsonString = response.text.trim();
    const skillTreeData = JSON.parse(jsonString);

    // Initialize node states
    skillTreeData.skill_tree.forEach((branch: any) => {
      branch.nodes.forEach((node: any, index: number) => {
        // First node of first branch is Mirage (unlocked but not anchored)
        // Others are locked
        // In a real app, we'd check user progress. Here we simulate a fresh start.
        if (branch.required_level === 1 && index === 0) {
          node.state = 'mirage';
          node.saturation = 0;
        } else {
          node.state = 'locked';
          node.saturation = 0;
        }
        node.lastPracticed = Date.now();
        node.id = node.node_name.replace(/\s+/g, '_').toLowerCase(); // Simple ID generation
      });
    });

    return skillTreeData as SkillTree;

  } catch (error) {
    console.error("Error generating skill tree:", error);
    throw new Error("Failed to generate your learning path. Please try again.");
  }
};

export const generateUITranslations = async (
  stringsToTranslate: Record<string, string>,
  sourceLang: Language,
  targetLang: Language
): Promise<Record<string, string>> => {
  const isDarija = targetLang.code === 'ary';

  const prompt = `
You are an expert localizer for a language learning app.
Translate the following UI text elements from ${sourceLang.name} to ${targetLang.name}.
The user is a language learner, so keep translations short, simple, and encouraging.
Maintain the JSON structure with the exact same keys.
The values should be the translated strings.
Variables like { variable } should be preserved in the translation.
  ${isDarija ? "For Moroccan Darija, provide translations in both Latin and Arabic script, formatted as 'Latin (Arabic)' (e.g., 'Salam (سلام)')." : ""}

Here is the JSON object to translate:
${JSON.stringify(stringsToTranslate, null, 2)}
`;

  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const jsonString = response.text.trim();
    const translatedData = JSON.parse(jsonString);
    return translatedData as Record<string, string>;
  } catch (error) {
    console.error("Error generating UI translations:", error);
    throw new Error("Failed to translate UI elements.");
  }
};

export const generateQuizFromCorrections = async (
  corrections: { original: string; corrected: string; explanation: string }[],
  sourceLang: Language,
  targetLang: Language
): Promise<QuizQuestion[]> => {
  if (corrections.length === 0) return [];

  const isDarija = targetLang.code === 'ary';
  const correctionsText = corrections.map(c =>
    `- Mistake: "${c.original}" -> Correct: "${c.corrected}"(${c.explanation})`
  ).join('\n');

  const prompt = `
    You are a language teacher creating a personalized practice quiz.
    The student made the following mistakes in a conversation:
    ${correctionsText}

    Generate ${Math.min(5, corrections.length)} multiple-choice questions to help them practice these specific concepts.
    Each question should test one of the mistakes listed above.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};

export const generatePracticeQuiz = async (
  nodes: SkillNode[],
  sourceLang: Language,
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const topics = nodes.map(n => `${n.node_name} (${n.content_examples.slice(0, 3).join(', ')})`).join('\n');

  const prompt = `
    You are a language teacher creating a "Daily Practice Ritual" quiz.
    The student needs to practice the following topics:
    ${topics}
    
    Generate 5 multiple-choice questions that mix these topics.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};

export const generateQuizFromMistakes = async (
  mistakes: Mistake[],
  sourceLang: Language,
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  // Take the last 5 mistakes to focus on recent issues
  const recentMistakes = mistakes.slice(0, 5);
  const mistakesText = recentMistakes.map(m => `Original: "${m.original}" -> Correction: "${m.correction}" (${m.explanation})`).join('\n');

  const prompt = `
    The student has made the following mistakes in previous sessions:
    ${mistakesText}

    Generate ${recentMistakes.length} multiple-choice questions specifically targeting these mistakes to help them learn.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};

export const generateOverdriveQuestions = async (
  sourceLang: Language,
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';

  const prompt = `
    You are a ruthless language master. The student is doing too well.
    Generate 2 HARD difficulty multiple-choice questions to challenge them.
    Focus on complex grammar, idioms, exceptions, or subtle nuances.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};

// Saga Map Generation


const getSagaMapSchema = () => ({
  type: Type.OBJECT,
  properties: {
    cities: {
      type: Type.ARRAY,
      description: "A list of major milestones (Cities) for the user's journey.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Creative fantasy name for the location (e.g., 'Whispering Woods', 'Sunken Library')." },
          titleNative: { type: Type.STRING, description: "The translation of the title in the user's native language." },
          description: { type: Type.STRING, description: "Short lore description." },
          descriptionNative: { type: Type.STRING, description: "Short lore description in the user's native language." },
          topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of language topics covered here (e.g., 'Past Tense', 'Food Vocabulary')."
          },
          level: { type: Type.INTEGER, description: "Recommended user level." }
        },
        required: ['title', 'titleNative', 'description', 'descriptionNative', 'topics', 'level']
      }
    }
  },
  required: ['cities']
});

export const generateSagaMap = async (
  sourceLang: Language,
  targetLang: Language,
  userLevel: number,
  learnerProfile?: LearnerProfile | null
): Promise<SagaMap> => {
  const isDarija = targetLang.code === 'ary';

  // Learners who placed above A1 get a roadmap that starts at their band
  // instead of the alphabet.
  const cefr = learnerProfile?.cefr ?? 'A1';
  const nextBand = CEFR_LADDER[Math.min(CEFR_LADDER.indexOf(cefr) + 1, CEFR_LADDER.length - 1)];
  const progressionBlock = cefr === 'A1'
    ? `
    Generate 5 "Cities"(Major Milestones) that guide the user from ABSOLUTE BEGINNER(A0) to BEGINNER(A1).

    STRICT PROGRESSION:
- City 1: "The Awakening" - Topics: Alphabet / Script, Basic Sounds, Yes / No, Hello / Goodbye.
    - City 2: "The First Words" - Topics: Numbers(1 - 10), Colors, Common Objects(Book, Pen, Door).
    - City 3: "The Social Circle" - Topics: Personal Pronouns(I, You), Family Members, Introductions("My name is...").
    - City 4: "The Marketplace" - Topics: Food Basics(Bread, Water), Simple Questions(What is this ?, How much ?), Politeness.
    - City 5: "The Journey Begins" - Topics: Basic Verbs(Go, Eat, Drink), Present Tense Basics, Directions(Left, Right).`
    : `
    ${buildLearnerContext(learnerProfile)}

    Generate 5 "Cities"(Major Milestones) that guide the user from ${cefr} to ${nextBand}.

    STRICT PROGRESSION:
    - City 1 starts at solid ${cefr} material: consolidate what a ${cefr} learner already half-knows${learnerProfile && learnerProfile.weakAreas.length > 0 ? `, opening with their weak areas (${learnerProfile.weakAreas.join(', ')})` : ''}.
    - Cities 2-4 climb steadily through the gap between ${cefr} and ${nextBand}: richer tenses, connectors, real conversations, longer reading.
    - City 5 lands at entry-level ${nextBand} material.
    - Never include alphabet, "hello/goodbye" or other absolute-beginner topics — this learner is past them.`;

  const prompt = `
    You are a Fantasy Cartographer and Language Curriculum Designer.
    Create a "Saga Map" for a user learning ${targetLang.name} (Level ${userLevel}).
    ${progressionBlock}

    - The names of the cities should be evocative and fantasy - themed but reflect these learning stages.
    ${learnerProfile && learnerProfile.interests.length > 0 ? `- Flavor the cities' lore around the learner's interests: ${learnerProfile.interests.join(', ')}.` : ''}
    - IMPORTANT: 'title' and 'description' must be in ${targetLang.name}.
    - IMPORTANT: 'titleNative' and 'descriptionNative' must be in ${sourceLang.name} ONLY. Do NOT include ${targetLang.name} or Arabic script in these fields.
    - QUALITY CONTROL: Ensure all ${targetLang.name} text is grammatically correct and uses authentic vocabulary. Do NOT invent words.

  ${isDarija ? "Include Moroccan cultural themes. For 'title' and 'description' (which are in Darija), provide both Latin and Arabic script formatted as 'Latin (Arabic)'." : ""}
    
    Output strictly in JSON.
    `;

  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getSagaMapSchema(),
        temperature: 0.7,
      },
    });

    const data = JSON.parse(response.text.trim());
    const cities = data.cities;

    const nodes: MapNode[] = [];
    let currentNodeId = 0;

    // Biome logic: 3 biomes, cycling every 2 cities
    const biomes: MapBiome[] = ['forest', 'desert', 'mountain'];

    cities.forEach((city: any, index: number) => {
      const biome = biomes[Math.floor(index / 2) % biomes.length];

      // 1. Add City Node
      const cityNode: MapNode = {
        id: `node_${currentNodeId++} `,
        type: 'city',
        status: index === 0 ? 'available' : 'locked',
        position: { x: 50, y: 0 }, // Placeholder, will calculate layout below
        biome: biome,
        title: city.title,
        titleNative: city.titleNative,
        description: city.description,
        descriptionNative: city.descriptionNative,
        level: city.level,
        topics: city.topics
      };
      nodes.push(cityNode);

      // 2. Add Waypoints (Road) between cities
      // Add 3 waypoints after each city (except the last one, maybe?)
      if (index < cities.length - 1) {
        for (let i = 0; i < 3; i++) {
          nodes.push({
            id: `node_${currentNodeId++} `,
            type: 'waypoint',
            status: 'locked',
            position: { x: 0, y: 0 },
            biome: biome,
            title: `Path to ${cities[index + 1].title} `,
            titleNative: `Path to ${cities[index + 1].titleNative} `,
            description: "Complete a quiz to move forward.",
            descriptionNative: "Complete a quiz to move forward.",
            level: city.level
          });
        }
      }
    });

    // 3. Layout Calculation (Winding Road)
    // We want a vertical scroll, so Y increases. X oscillates.
    nodes.forEach((node, i) => {
      const ySpacing = 150;
      node.position.y = i * ySpacing;

      // Sine wave for X: Center is 50%, amplitude 30%
      // Frequency: One full wave every ~6 nodes
      node.position.x = 50 + 30 * Math.sin(i * 0.8);
    });

    return {
      nodes,
      currentBiome: 'forest',
      userPosition: nodes[0].id
    };

  } catch (error) {
    console.error("Error generating Saga Map:", error);
    throw new Error("Failed to generate the map.");
  }
};

export const generateQuizFromTopics = async (
  topics: string[],
  sourceLang: Language,
  targetLang: Language,
  learnerProfile?: LearnerProfile | null
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const prompt = `
    Generate a quiz with 5 questions for a language learner.
    ${buildLearnerContext(learnerProfile)}
    Topics: ${topics.join(', ')}
    The questions should test vocabulary and phrases related to the provided topics.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};

export const generateMistakeReviewQuiz = async (
  mistakes: Mistake[],
  sourceLang: Language,
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const mistakeList = mistakes
    .slice(0, 15)
    .map(m => `- Learner said: "${m.original}" → Correct form: "${m.correction}" (${m.explanation})`)
    .join('\n');

  const prompt = `
    You are building a personalized remediation quiz for a ${sourceLang.name} speaker learning ${targetLang.name}.
    Below are real mistakes this learner made recently. Create 5 multiple-choice questions
    that each target the underlying rule or vocabulary behind one of these mistakes.
    Test the corrected forms in NEW sentences and contexts — do not repeat the original sentences verbatim.
    Prioritize the most recent and most instructive mistakes.

    Learner's past mistakes:
    ${mistakeList}

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};

// --- PLACEMENT TEST ---
// One generation call produces the whole test: tagged MCQs across the CEFR
// bands around the learner's self-assessment, plus free-writing prompts.

const getPlacementSchema = () => ({
  type: Type.OBJECT,
  properties: {
    mcq: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The question, in the learner's native language. For reading questions, include the target-language passage inside the question." },
          choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 4 options in the target language." },
          correctIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)." },
          skill: { type: Type.STRING, description: "One of: vocabulary, grammar, reading." },
          cefr: { type: Type.STRING, description: "CEFR band of this question: A1, A2, B1, B2, or C1." },
          explanation: { type: Type.STRING, description: "Brief explanation in the native language (max 25 words)." },
          topic: { type: Type.STRING, description: "1-3 word English topic label (e.g. 'past tense')." },
        },
        required: ['question', 'choices', 'correctIndex', 'skill', 'cefr', 'explanation', 'topic'],
      },
    },
    writing: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: "A writing task in the learner's native language asking them to write 1-3 sentences in the target language." },
          cefr: { type: Type.STRING, description: "CEFR band of this task." },
          guidance: { type: Type.STRING, description: "One short hint in the native language about what to include." },
        },
        required: ['prompt', 'cefr', 'guidance'],
      },
    },
  },
  required: ['mcq', 'writing'],
});

const asCefr = (value: string, fallback: CefrLevel): CefrLevel =>
  (CEFR_LADDER as string[]).includes(value) ? (value as CefrLevel) : fallback;

const asSkill = (value: string): PlacementSkill =>
  value === 'grammar' || value === 'reading' ? value : 'vocabulary';

export const generatePlacementTest = async (
  sourceLang: Language,
  targetLang: Language,
  selfAssessed: SelfAssessedLevel
): Promise<PlacementTest> => {
  const isDarija = targetLang.code === 'ary';
  const bands = BANDS_FOR_SELF_ASSESSED[selfAssessed];
  const perBand = Math.floor(MCQ_COUNT / bands.length);
  const remainder = MCQ_COUNT - perBand * bands.length;
  const distribution = bands
    .map((band, i) => `${perBand + (i < remainder ? 1 : 0)} questions at ${band}`)
    .join(', ');

  const prompt = `
    Create a placement test for a ${sourceLang.name} speaker learning ${targetLang.name}.
    The learner estimates their own level as: ${selfAssessed}.

    PART 1 — exactly ${MCQ_COUNT} multiple-choice questions:
    - Band distribution (MUST match exactly): ${distribution}.
    - Skill distribution: 7 'vocabulary', 7 'grammar', 7 'reading' — spread each skill across all bands.
    - 'reading' questions: include a short ${targetLang.name} passage (1-3 sentences) inside the question, then ask a comprehension question about it in ${sourceLang.name}.
    - 'vocabulary' and 'grammar' questions: written in ${sourceLang.name}, with the 4 answer choices in ${targetLang.name}.
    - Order the questions from easiest band to hardest band.
    - Tag every question with its exact 'skill' and 'cefr'.

    PART 2 — exactly ${WRITING_COUNT} short writing tasks:
    - One at the lowest tested band (${bands[0]}), one mid-range, one at the highest (${bands[bands.length - 1]}).
    - Each asks the learner (in ${sourceLang.name}) to write 1-3 sentences in ${targetLang.name} about an everyday situation.

    RULES:
    1. Questions, explanations, writing prompts and guidance are in ${sourceLang.name}.
    2. Answer choices are in ${targetLang.name}. Only one correct answer. No invented or misspelled words.
    3. Output ONLY valid JSON matching the schema.
    ${isDarija ? `4. SPECIAL DARIJA RULE: all Darija text (choices, passages) MUST carry both Arabic script and Latin transliteration in this exact format: "Arabic (Latin)" e.g. "سلام (salam)".` : ''}
  `;

  const response = await generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: getPlacementSchema(),
      temperature: 0.7,
    },
  });

  const data = JSON.parse(response.text.trim());
  const parseText = (text: string): QuizText => (isDarija ? parseDarijaResponse(text) : text);

  const mcq: PlacementQuestion[] = (data.mcq || [])
    .filter((q: any) => Array.isArray(q.choices) && q.choices.length >= 2
      && q.correctIndex >= 0 && q.correctIndex < q.choices.length)
    .map((q: any): PlacementQuestion => ({
      question: q.question,
      options: q.choices.map(parseText),
      correctAnswer: parseText(q.choices[q.correctIndex]),
      explanation: q.explanation,
      topic: q.topic,
      skill: asSkill(q.skill),
      cefr: asCefr(q.cefr, bands[0]),
    }));
  // Keep the promised easy→hard ramp even if the model shuffled bands.
  mcq.sort((a, b) => CEFR_LADDER.indexOf(a.cefr) - CEFR_LADDER.indexOf(b.cefr));

  const writing: WritingPrompt[] = (data.writing || []).slice(0, WRITING_COUNT).map((w: any) => ({
    prompt: w.prompt,
    cefr: asCefr(w.cefr, bands[0]),
    guidance: w.guidance ?? '',
  }));

  if (mcq.length < 10) throw new Error('Placement test came back too short.');
  return { mcq, writing };
};

const getWritingGradesSchema = () => ({
  type: Type.OBJECT,
  properties: {
    grades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: "0-5. 0=empty/unintelligible, 3=understandable with errors, 5=natural and correct." },
          feedback: { type: Type.STRING, description: "One encouraging sentence in the learner's native language." },
        },
        required: ['score', 'feedback'],
      },
    },
  },
  required: ['grades'],
});

/**
 * Grades the free-writing answers 0-5 each. Empty answers are scored 0
 * locally and never sent to the model.
 */
export const gradeWriting = async (
  tasks: { prompt: string; answer: string }[],
  sourceLang: Language,
  targetLang: Language
): Promise<WritingGrade[]> => {
  const grades: WritingGrade[] = tasks.map(() => ({ score: 0, feedback: 'No answer given.' }));
  const toGrade = tasks
    .map((t, index) => ({ ...t, index }))
    .filter(t => t.answer.trim().length > 0);
  if (toGrade.length === 0) return grades;

  const answersText = toGrade
    .map((t, i) => `Task ${i + 1}: "${t.prompt}"\nLearner's answer (${targetLang.name}): "${t.answer.trim()}"`)
    .join('\n\n');

  const prompt = `
    You are grading a ${targetLang.name} placement test's writing section for a ${sourceLang.name} speaker.
    Grade each answer 0-5:
    - 0: empty, not in ${targetLang.name}, or unintelligible.
    - 1-2: fragments, heavy errors that block understanding.
    - 3: understandable despite clear errors.
    - 4: mostly correct, minor slips.
    - 5: natural, correct ${targetLang.name}.
    Be strict: pasted ${sourceLang.name}, gibberish or off-task text scores 0.
    Give one short, encouraging feedback sentence per answer in ${sourceLang.name}.
    Return exactly ${toGrade.length} grades, in the same order as the tasks.

    ${answersText}
  `;

  const response = await generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: getWritingGradesSchema(),
      temperature: 0.2,
    },
  });

  const data = JSON.parse(response.text.trim());
  (data.grades || []).forEach((g: any, i: number) => {
    if (i < toGrade.length) {
      grades[toGrade[i].index] = {
        score: Math.max(0, Math.min(5, Math.round(g.score ?? 0))),
        feedback: g.feedback ?? '',
      };
    }
  });
  return grades;
};
// Episode Generation


const getEpisodeSchema = (isDarija: boolean) => ({
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the episode." },
    intro_narrative: { type: Type.STRING, description: "A compelling intro story setting the scene." },
    how_to_play: { type: Type.STRING, description: "Clear instructions on how to play this episode." },
    scenarios: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the scenario." },
          type: { type: Type.STRING, enum: ['dialogue', 'negotiation', 'investigation', 'puzzle', 'combat'] },
          description: { type: Type.STRING, description: "Description of the problem." },
          objective: { type: Type.STRING, description: "What the user must do." },
          opening_line: { type: Type.STRING, description: "The first sentence the NPC says to start the interaction." },
          character_role: { type: Type.STRING, description: "The name or role of the NPC (e.g., 'Suspicious Merchant')." },
          situation: { type: Type.STRING, description: "A one-sentence context setting for the user (e.g., 'You need to buy a map')." },
          disposition: { type: Type.STRING, enum: ['friendly', 'neutral', 'hostile'], description: "The NPC's initial attitude." },
          rewards: {
            type: Type.OBJECT,
            properties: {
              xp: { type: Type.INTEGER },
              items: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['xp']
          }
        },
        required: ['title', 'type', 'description', 'objective', 'opening_line', 'character_role', 'situation', 'disposition']
      }
    }
  },
  required: ['title', 'intro_narrative', 'scenarios']
});

export const generateEpisode = async (
  node: MapNode,
  sourceLang: Language,
  targetLang: Language,
  learnerProfile?: LearnerProfile | null
): Promise<Episode> => {
  const isDarija = targetLang.code === 'ary';
  const prompt = `
    You are a Dungeon Master for a language learning RPG.
    Create an "Episode" for the location: "${node.title}"(${node.description}).
    Target Language: ${targetLang.name}.
    User Level: ${node.level}.
Topics: ${node.topics?.join(', ') || 'General Adventure'}.
    ${buildLearnerContext(learnerProfile)}

    Generate 3 "Scenarios" that the user must overcome using their language skills.
    
    IMPORTANT:
    - 'intro_narrative' MUST be in ${sourceLang.name} (User's Native Language).
    - 'how_to_play' MUST be in ${sourceLang.name} (User's Native Language). Keep it SHORT (max 2 sentences), PRECISE, and IMMERSIVE. Focus on the immediate goal. Example: "Negotiate with the guard to enter the city. Use your greetings and polite phrases to win him over."
    - 'title' should be in ${targetLang.name}.
    - QUALITY CONTROL: Ensure all ${targetLang.name} text is grammatically correct. Do NOT invent words.

  SCENARIO TYPES:
    1. 'dialogue': A social interaction (e.g., Greeting a guard).
    2. 'negotiation': Buying/Selling or persuading.
    3. 'investigation': Asking questions to find info.
    4. 'puzzle': Deciphering a text or riddle.
    5. 'combat': Rapid-fire vocabulary challenge.

  ${isDarija ? "For Moroccan Darija, ensure the narrative reflects Moroccan culture (souks, tea, hospitality)." : ""}

    Output strictly in JSON.
  `;

  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getEpisodeSchema(isDarija),
        temperature: 0.8,
      },
    });

    const data = JSON.parse(response.text.trim());

    return {
      id: `ep_${node.id}_${Date.now()}`,
      nodeId: node.id,
      title: data.title,
      intro_narrative: data.intro_narrative,
      how_to_play: data.how_to_play,
      scenarios: data.scenarios.map((s: any, i: number) => ({
        ...s,
        id: `sc_${node.id}_${i}`,
        status: i === 0 ? 'active' : 'locked', // First one active
        rewards: s.rewards || { xp: 50 }
      })),
      is_completed: false,
      unlocked_at: Date.now()
    };

  } catch (error) {
    console.error("Error generating episode:", error);
    throw new Error("Failed to generate episode.");
  }
};

// Training Grounds - Sub-lesson Generation


export const generateSubLessons = async (
  skillNode: SkillNode,
  sourceLang: Language,
  targetLang: Language,
  learnerProfile?: LearnerProfile | null
): Promise<SubLesson[]> => {
  const isDarija = targetLang.code === 'ary';

  const prompt = `
You are creating a structured learning curriculum for ${targetLang.name}.
Based on this skill topic: "${skillNode.node_name}" - ${skillNode.objective}
${buildLearnerContext(learnerProfile)}

Generate 5-30 sub-lessons that break down this topic into bite-sized, sequential learning units.

Each sub-lesson should:
- Have a clear, focused title
- Cover 1-2 specific aspects of the main topic
- Progress from easier to harder concepts
- Include 5-20 practice questions (higher difficulty = more questions)

Example topics from this skill: ${skillNode.content_examples.slice(0, 3).join(', ')}

Output JSON array format:
[
  {
    "title": "Brief, clear title",
    "description": "1 sentence describing what you'll learn",
    "difficulty": 1 | 2 | 3,
    "questionCount": 5-20,
    "topics": ["specific topic 1", "specific topic 2"]
  }
]
  `;

  try {
    const response = await generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.NUMBER },
              questionCount: { type: Type.NUMBER },
              topics: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['title', 'description', 'difficulty', 'questionCount', 'topics']
          }
        },
        temperature: 0.7,
      },
    });

    const data = JSON.parse(response.text.trim());

    return data.map((item: any, index: number) => ({
      id: `${skillNode.id}_sl_${index}`,
      parentSkillId: skillNode.id,
      title: item.title,
      description: item.description,
      difficulty: item.difficulty,
      questionCount: item.questionCount,
      status: index === 0 ? 'available' : 'locked', // First one unlocked
      topics: item.topics,
      order: index
    }));

  } catch (error) {
    console.error("Error generating sub-lessons:", error);
    throw new Error("Failed to generate sub-lessons.");
  }
};

export const generatePracticeQuizForSubLesson = async (
  subLesson: SubLesson,
  sourceLang: Language,
  targetLang: Language,
  learnerProfile?: LearnerProfile | null
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const topicsText = subLesson.topics.join(', ');

  const prompt = `
    Create a practice quiz for learning ${targetLang.name}.
    ${buildLearnerContext(learnerProfile)}
    Topic: ${subLesson.title}
    Focus areas: ${topicsText}
    Difficulty: ${subLesson.difficulty === 1 ? 'Beginner' : subLesson.difficulty === 2 ? 'Intermediate' : 'Advanced'}
    Number of questions: ${subLesson.questionCount}
    Mix question types: vocabulary, grammar, sentence construction.
    Gradually increase difficulty within the quiz.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
};
