import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}']
      },
      manifest: {
        name: 'PCT Mission Control',
        short_name: 'PCT Control',
        description: 'Offline-capable backcountry dashboard for PCT Section O.',
        theme_color: '#346855',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
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
