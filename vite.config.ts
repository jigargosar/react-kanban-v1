import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'

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
    checker({
      typescript: {
        tsconfigPath: '../tsconfig.app.json',
      },
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint .',
      },
      overlay: false,
    }),
  ],
})
