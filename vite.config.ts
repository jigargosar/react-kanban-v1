import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import eslint from 'vite-plugin-eslint2'

export default defineConfig({
  root: 'src',
  base: process.env.BASE_URL || '/',
  publicDir: '../public',
  build: {
    outDir: '../dist',
  },
  plugins: [
    react(),
    tailwindcss(),
    eslint({
      build: false,
      lintOnStart: true,
      emitErrorAsWarning: true,
    }),
  ],
})
