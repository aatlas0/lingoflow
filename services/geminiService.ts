import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import type { Language, QuizQuestion, DarijaText, SkillTree, CulturalNugget, SkillNode, Mistake, QuizText, SagaMap, MapNode, MapBiome, Episode, Scenario, SubLesson, TrainingCategory } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Please set it to use Gemini API.");
}

// Single model for all text generation: flash-lite is ~6x cheaper than flash
// ($0.25/M in, $1.50/M out) and handles this app's structured-JSON workloads.
const TEXT_MODEL = "gemini-3.1-flash-lite";

// Lazy init: constructing GoogleGenAI without a key throws in the browser,
// and at module scope that would blank the entire app on load.
let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (!_ai) {
    if (!API_KEY) {
      throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY and rebuild the app.");
    }
    _ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return _ai;
};

// Helper to parse Darija responses which may not be perfect JSON
export const parseDarijaResponse = (text: string): DarijaText => {
  const match = text.match(/([\u0600-\u06FF\s]+)\s*\((.*?)\)/);
  if (match) {
    return { arabic: match[1].trim(), latin: match[2].trim() };
  }
  // Fallback if parsing fails
  return { arabic: text, latin: '(transliteration not available)' };
};

// --- STRICT QUIZ IMPLEMENTATION ---

interface StrictQuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
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
          explanation: { type: Type.STRING, description: "Brief explanation in native language (max 25 words)." }
        },
        required: ['question', 'choices', 'correctIndex', 'explanation']
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
    explanation: q.explanation
  };
};

const _generateQuizInternal = async (prompt: string, isDarija: boolean): Promise<QuizQuestion[]> => {
  try {
    const response = await getAi().models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getStrictQuizSchema(),
        temperature: 0.7,
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
      "explanation": "string"
    }
  ]
}

NOTES:
- Explanation (${sourceLang.name}) max 25 words.
- Keep the JSON structure EXACT.
- Do not add extra fields.
`;

// --- EXPORTED FUNCTIONS ---

export const generateQuiz = async (sourceLang: Language, targetLang: Language, userLevel: number = 1): Promise<QuizQuestion[]> => {
  console.log(`Generating Daily Quiz for Level: ${userLevel}`);
  const isDarija = targetLang.code === 'ary';

  const prompt = `
    Generate 5 multiple-choice questions for learning ${targetLang.name}.
    User Level: ${userLevel} (1=Beginner, 20=Advanced).
    Focus: Common daily phrases and vocabulary suitable for this level.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
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

const getStandardChatSystemInstruction = (sourceLang: Language, targetLang: Language) => `
You are a friendly language tutor for ${targetLang.name}.
Your student is a beginner.Engage in a simple, practical conversation in ${targetLang.name}.

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

export const createChatSession = (sourceLang: Language, targetLang: Language): Chat => {
  const systemInstruction = targetLang.code === 'ary'
    ? getDarijaChatSystemInstruction(sourceLang)
    : getStandardChatSystemInstruction(sourceLang, targetLang);

  const chat = getAi().chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: getChatResponseSchema(),
    },
  });
  return chat;
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
    const response = await getAi().models.generateContent({
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

const getSkillTreePrompt = (sourceLang: Language, targetLang: Language, userLevel: number) => {
  const isDarija = targetLang.code === 'ary';
  return `
You are an expert AI Language Curriculum Designer for a gamified app called LingoFlow.
Your task is to create a structured and personalized Skill Tree for a ${sourceLang.name} speaker learning ${targetLang.name}.
The user is currently at Level ${userLevel}.

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


export const generateSkillTree = async (sourceLang: Language, targetLang: Language, userLevel: number): Promise<SkillTree> => {
  const prompt = getSkillTreePrompt(sourceLang, targetLang, userLevel);

  try {
    const response = await getAi().models.generateContent({
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
    const response = await getAi().models.generateContent({
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
  userLevel: number
): Promise<SagaMap> => {
  const isDarija = targetLang.code === 'ary';
  const prompt = `
    You are a Fantasy Cartographer and Language Curriculum Designer.
    Create a "Saga Map" for a user learning ${targetLang.name} (Level ${userLevel}).
    
    Generate 5 "Cities"(Major Milestones) that guide the user from ABSOLUTE BEGINNER(A0) to BEGINNER(A1).
    
    STRICT PROGRESSION:
- City 1: "The Awakening" - Topics: Alphabet / Script, Basic Sounds, Yes / No, Hello / Goodbye.
    - City 2: "The First Words" - Topics: Numbers(1 - 10), Colors, Common Objects(Book, Pen, Door).
    - City 3: "The Social Circle" - Topics: Personal Pronouns(I, You), Family Members, Introductions("My name is...").
    - City 4: "The Marketplace" - Topics: Food Basics(Bread, Water), Simple Questions(What is this ?, How much ?), Politeness.
    - City 5: "The Journey Begins" - Topics: Basic Verbs(Go, Eat, Drink), Present Tense Basics, Directions(Left, Right).

    - The names of the cities should be evocative and fantasy - themed but reflect these learning stages.
    - IMPORTANT: 'title' and 'description' must be in ${targetLang.name}.
    - IMPORTANT: 'titleNative' and 'descriptionNative' must be in ${sourceLang.name} ONLY. Do NOT include ${targetLang.name} or Arabic script in these fields.
    - QUALITY CONTROL: Ensure all ${targetLang.name} text is grammatically correct and uses authentic vocabulary. Do NOT invent words.

  ${isDarija ? "Include Moroccan cultural themes. For 'title' and 'description' (which are in Darija), provide both Latin and Arabic script formatted as 'Latin (Arabic)'." : ""}
    
    Output strictly in JSON.
    `;

  try {
    const response = await getAi().models.generateContent({
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
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const prompt = `
    Generate a quiz with 5 questions for a language learner.
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

export const generatePlacementQuiz = async (
  sourceLang: Language,
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const prompt = `
    Create a 10-question placement test for a ${sourceLang.name} speaker learning ${targetLang.name}.
    The difficulty MUST ramp steadily:
    - Questions 1-2: absolute beginner (A1) — basic greetings, simple vocabulary.
    - Questions 3-4: elementary (A2) — everyday phrases, simple present tense.
    - Questions 5-6: intermediate (B1) — past/future tenses, common idioms.
    - Questions 7-8: upper-intermediate (B2) — nuanced word choice, complex grammar.
    - Questions 9-10: advanced (C1) — subtle distinctions, formal register, rare vocabulary.
    Exactly 10 questions, each with 4 choices.

    ${getStrictRules(sourceLang, targetLang, isDarija)}
  `;

  return _generateQuizInternal(prompt, isDarija);
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
  targetLang: Language
): Promise<Episode> => {
  const isDarija = targetLang.code === 'ary';
  const prompt = `
    You are a Dungeon Master for a language learning RPG.
    Create an "Episode" for the location: "${node.title}"(${node.description}).
    Target Language: ${targetLang.name}.
    User Level: ${node.level}.
Topics: ${node.topics?.join(', ') || 'General Adventure'}.

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
    const response = await getAi().models.generateContent({
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
  targetLang: Language
): Promise<SubLesson[]> => {
  const isDarija = targetLang.code === 'ary';

  const prompt = `
You are creating a structured learning curriculum for ${targetLang.name}.
Based on this skill topic: "${skillNode.node_name}" - ${skillNode.objective}

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
    const response = await getAi().models.generateContent({
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
  targetLang: Language
): Promise<QuizQuestion[]> => {
  const isDarija = targetLang.code === 'ary';
  const topicsText = subLesson.topics.join(', ');

  const prompt = `
    Create a practice quiz for learning ${targetLang.name}.
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
