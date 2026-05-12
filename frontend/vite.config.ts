import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Redirect all non-API, non-Vite-HMR routes to / for SPA fallback
          // This fixes 404 on page refresh for React Router routes like /settings
          if (
            req.method === 'GET' &&
            req.url &&
            !req.url.startsWith('/api') &&
            !req.url.startsWith('/@') &&
            !req.url.startsWith('/node_modules') &&
            !req.url.includes('.')
          ) {
            req.url = '/'
          }
          next()
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
