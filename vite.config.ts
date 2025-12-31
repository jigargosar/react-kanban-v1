import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'src',
  base: process.env.BASE_URL || '/',
  publicDir: '../public',
  build: {
    outDir: '../dist',
  },
  plugins: [react(), tailwindcss()],
})
