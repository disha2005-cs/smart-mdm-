import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Absolute asset paths by default: a deep link like /dashboard is served
  // index.html by nginx, and relative paths would resolve against /dashboard/
  // and 404. The Electron build opens index.html over file://, where only
  // relative paths work, so it sets ELECTRON_BUILD=1.
  base: process.env.ELECTRON_BUILD ? './' : '/',

  server: {
    host: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok.app'],
    proxy: {
      // Lets `npm run dev` talk to a local backend without CORS.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Recharts and React dominate the bundle; splitting them out keeps the
    // main chunk small enough to parse quickly on low-end school hardware,
    // and lets the browser cache them across deploys.
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'charts', test: /node_modules[/\\]recharts/ },
            { name: 'react', test: /node_modules[/\\](react|react-dom|react-router)/ },
          ],
        },
      },
    },
  },
});
