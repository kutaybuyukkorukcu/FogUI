import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Sentry source map upload (only in production build)
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Only upload source maps in CI
      disable: !process.env.CI,
    }),
  ],
  build: {
    sourcemap: true, // Required for Sentry source maps
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api.virtuoapps.com',
        changeOrigin: true,
      },
      '/auth': {
        target: 'https://api.virtuoapps.com',
        changeOrigin: true,
      },
    },
  },
});
