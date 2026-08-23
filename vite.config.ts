import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ isSsrBuild }) => ({
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
        //
        // Rollup rejects manual chunking on the SSR pass, which inlines its
        // dynamic imports into a single file by design. That build is a
        // throwaway prerender artefact, so its shape does not matter.
        manualChunks: isSsrBuild
          ? undefined
          : (id: string) => {
              // Windows ids arrive with backslashes; normalise before matching
              // or every rule below silently never fires.
              const path = id.replace(/\\/g, '/');
              if (path.includes('node_modules/three/')) return 'three';
              if (path.includes('@react-three')) return 'r3f';
              if (path.includes('framer-motion')) return 'motion';
              // Split from framer-motion rather than sharing its chunk: the DOM
              // motion layer is needed for the first paint and the scroll
              // engine is not, so bundling them together would put GSAP on the
              // critical path for nothing.
              if (path.includes('node_modules/gsap/')) return 'gsap';
              return undefined;
            },
      },
    },
  },
}));
