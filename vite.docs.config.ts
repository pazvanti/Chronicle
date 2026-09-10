import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for building the web app deployed in docs/app/ for GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs/app',
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
  },
});
