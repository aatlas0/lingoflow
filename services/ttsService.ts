
import { generateContent } from './geminiProxy';

// --- Browser speech synthesis (free) ---

// Chrome loads voices asynchronously; the first getVoices() call can be empty.
const loadVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    const timer = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
  });

const playWithBrowser = async (text: string, langCode?: string): Promise<void> => {
  if (!('speechSynthesis' in window)) {
    throw new Error("Speech is not supported in this browser.");
  }

  const voices = await loadVoices();
  const voice = langCode
    ? voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) ?? null
    : null;
  if (langCode && !voice) {
    throw new Error("No voice available for this language on your device.");
  }

  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (langCode) utterance.lang = langCode;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9; // slightly slower for learners
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      // Cancellation (user clicked another speaker) isn't a failure.
      if (e.error === 'canceled' || e.error === 'interrupted') resolve();
      else reject(new Error("Could not play audio."));
    };
    window.speechSynthesis.speak(utterance);
  });
};

// --- Gemini TTS (paid) — Darija only, since browsers ship no Darija voice ---

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

const playWithGemini = async (text: string): Promise<void> => {
  const response = await generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // A pleasant, neutral voice
        },
      },
    },
  });

  const base64Audio = response.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    // Don't fail silently — the speaker button looked dead when this happened.
    throw new Error("No audio was generated. Please try again.");
  }

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const audioBytes = decode(base64Audio);
  const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
};

export const playTextAsSpeech = async (text: string, langCode?: string): Promise<void> => {
  if (!text) return;

  try {
    if (langCode === 'ary') {
      await playWithGemini(text);
    } else {
      await playWithBrowser(text, langCode);
    }
  } catch (error) {
    console.error("Error generating or playing speech:", error);
    throw error instanceof Error ? error : new Error("Could not play audio.");
  }
};
