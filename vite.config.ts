import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // three and the r3f layer dwarf everything else. Splitting them out
        // lets the DOM shell — text, layout, fonts — paint while the WebGL
        // chunk is still arriving, which is the whole point of the loader
        // being a fade rather than a blocker.
        manualChunks(id) {
          // Windows ids arrive with backslashes; normalise before matching or
          // every rule below silently never fires.
          const path = id.replace(/\\/g, '/');
          if (path.includes('node_modules/three/')) return 'three';
          if (path.includes('@react-three')) return 'r3f';
          if (path.includes('framer-motion') || path.includes('gsap')) return 'motion';
          return undefined;
        },
      },
    },
  },
});
