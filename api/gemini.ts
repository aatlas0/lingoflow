import { GoogleGenAI } from '@google/genai';

// Server-side Gemini proxy: the API key lives ONLY here (Vercel env var),
// never in the browser bundle. Callers must present a valid Supabase session
// token, so only signed-in LingoFlow users can spend tokens.

const ALLOWED_MODELS = new Set([
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-tts-preview',
]);

// Generous cap — chat histories are the largest payloads.
const MAX_REQUEST_BYTES = 300_000;

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.');
  if (!_ai) _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

const verifySupabaseUser = async (authHeader: string | undefined): Promise<boolean> => {
  const token = (authHeader || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  return res.ok;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    if (!(await verifySupabaseUser(req.headers?.authorization))) {
      res.status(401).json({ error: 'Sign in to use the AI features.' });
      return;
    }

    const { model, contents, config } = req.body ?? {};
    if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
      res.status(400).json({ error: 'Unsupported model.' });
      return;
    }
    if (!contents || JSON.stringify(contents).length > MAX_REQUEST_BYTES) {
      res.status(413).json({ error: 'Request too large.' });
      return;
    }

    const response = await getAi().models.generateContent({ model, contents, config });

    res.status(200).json({
      text: response.text ?? '',
      // TTS responses carry audio as inlineData parts instead of text.
      parts: response.candidates?.[0]?.content?.parts ?? null,
    });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    res.status(502).json({ error: 'AI generation failed. Please try again.' });
  }
}
