import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'

export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@external-lib': resolve(__dirname, 'src/external-lib'),
    },
  },
  plugins: [
    react({
      tsDecorators: true,
    }),
    tailwindcss(),
    checker({
      typescript: {
        tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
      },
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint .',
      },
      overlay: false,
    }),
  ],
})
