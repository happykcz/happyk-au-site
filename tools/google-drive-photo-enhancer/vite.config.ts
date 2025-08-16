import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Ensure built assets use relative paths for GitHub Pages under /tools/.../
    base: './',
    define: {
      // Do NOT expose a generic API_KEY to avoid accidental Gemini key leakage.
      // Keep Gemini usage mocked in the browser until configured.
      'process.env.CLIENT_ID': 'undefined',
      'process.env.GOOGLE_API_KEY': 'undefined',
      'process.env.GEMINI_API_KEY': 'undefined',
      'process.env.API_KEY': 'undefined'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Build to a temp dir; a postbuild step will copy to this folder.
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    }
  };
});
