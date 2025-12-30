import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages deploys to /DDG-PCT/ subdirectory
  // Use '/' for dev, '/DDG-PCT/' for production build
  base: command === 'serve' ? '/' : '/DDG-PCT/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/react-dom/')) return 'react-dom';
          if (id.includes('/react/')) return 'react';

          if (id.includes('/@deck.gl/')) return 'deck-gl';
          if (id.includes('/maplibre-gl/')) return 'maplibre-gl';
          if (id.includes('/react-map-gl/')) return 'react-map-gl';
          if (id.includes('/d3-scale/')) return 'd3';

          if (id.includes('/@supabase/')) return 'supabase';

          return 'vendor';
        },
      },
    },
  },
}))
