import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for building a standalone widget bundle that can be
// embedded into a Shopify Online Store 2.0 theme or theme app extension.
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  esbuild: {
    // Remove all debug logs from the production bundle. console.error is kept
    // intentionally so browser error tracking tools can still capture it.
    drop: ['debugger'],
    pure: ['console.log', 'console.warn', 'console.debug', 'console.info'],
  },
  build: {
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: 'src/main.tsx',
      name: 'RcartWidget',
      formats: ['iife'],
      fileName: () => 'rcart-widget.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'rcart-widget[extname]',
        // Inline React into the bundle so the IIFE is self-contained.
        inlineDynamicImports: true,
      }
    }
  }
});
