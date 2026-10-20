/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages pubblica l'app in /<nome-repository>/ (nessun dominio personalizzato).
  // Da confermare quando creeremo il repository nella Fase 1.
  base: '/dualita/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
