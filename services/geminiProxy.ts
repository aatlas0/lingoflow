import { getSupabase } from './supabaseClient';

// All Gemini traffic goes through /api/gemini (see api/gemini.ts) so the API
// key never ships in the bundle. In `npm run dev` there is no /api server, so
// a dev-only key (injected by vite.config only in development mode) calls
// Google directly; production builds contain neither key nor SDK.

export interface ProxyPart {
  text?: string;
  inlineData?: { data: string; mimeType: string };
}

export interface ProxyResponse {
  text: string;
  parts: ProxyPart[] | null;
}

interface GenerateParams {
  model: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

const DEV_KEY = import.meta.env.DEV ? process.env.GEMINI_API_KEY : undefined;

export const generateContent = async (params: GenerateParams): Promise<ProxyResponse> => {
  if (DEV_KEY) {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: DEV_KEY });
    const response = await ai.models.generateContent(params as never);
    return {
      text: response.text ?? '',
      parts: (response.candidates?.[0]?.content?.parts as ProxyPart[]) ?? null,
    };
  }

  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to use the AI features.');

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `AI request failed (${res.status}).`);
  }
  return res.json();
};
