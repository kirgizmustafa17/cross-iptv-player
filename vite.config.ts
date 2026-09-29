import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Crucial for LG webOS and Samsung Tizen local file:// execution
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/xtream': {
        target: 'http://1dhn1.xyz:80',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xtream/, ''),
      },
      '/api/device': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
})
