import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Prefer CI/host-provided env (e.g. Vercel) over .env files
    const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      build: {
        rollupOptions: {
          output: {
            // Stable vendor chunks: app code changes don't bust the cached
            // react/supabase bytes, and views load as their own chunks.
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-dom/client'],
              'supabase': ['@supabase/supabase-js'],
            },
          },
        },
      },
      define: {
        // The key is injected ONLY into dev builds (npm run dev calls Google
        // directly). Production traffic goes through /api/gemini, where the
        // key lives server-side — never ship it in the bundle.
        'process.env.API_KEY': JSON.stringify(mode === 'development' ? geminiKey : ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(mode === 'development' ? geminiKey : '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
