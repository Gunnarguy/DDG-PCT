import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages deploys to /DDG-PCT/ subdirectory
  // Use '/' for dev, '/DDG-PCT/' for production build
  base: command === 'serve' ? '/' : '/DDG-PCT/',
}))
