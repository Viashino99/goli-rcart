import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// App-mode build: produces a deployable static site from index.html (the regular vite.config.ts
// is library/IIFE mode for the Shopify theme extension). Used to host the Goli reward flow as a
// standalone public website with the real API wired up — no Shopify theme, no theme-CSS bleed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': '"production"',
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: 'dist-app',
    assetsInlineLimit: 200_000,
  },
});
