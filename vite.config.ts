import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // 1. Explicitly replace the specific API key string
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // 2. Define process.env as an empty object for any other access
      // This prevents "Uncaught ReferenceError: process is not defined"
      'process.env': {}
    }
  };
});