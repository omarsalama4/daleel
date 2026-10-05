import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: command === 'build' ? { 'import.meta.env.VITE_DEV_TOKEN': JSON.stringify('') } : {},
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
}))
