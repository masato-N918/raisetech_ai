import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // フロントの /api へのリクエストをバックエンド(:8080)へ転送してCORSを回避する。
    // フロントは常に相対パス "/api/cards" を叩けばよい。
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
