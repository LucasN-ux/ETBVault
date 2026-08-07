/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
  server: {
    // Le backend écoute sur 3001 ; le front l'appelle en /api.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
