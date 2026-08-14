import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'analyze'
      ? visualizer({
          filename: 'dist/bundle-stats.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        })
      : null,
  ].filter(Boolean),
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');

          if (
            normalizedId.includes('/node_modules/driver.js/')
            || (
              normalizedId.includes('/src/features/tutorials/')
              && !normalizedId.endsWith('/TutorialsPage.tsx')
              && !normalizedId.endsWith('/tutorials-page.css')
            )
          ) {
            return 'tutorial-runtime';
          }

          if (!normalizedId.includes('/node_modules/')) {
            return undefined;
          }

          if (normalizedId.includes('@sentry/react')) {
            return 'observability';
          }

          if (normalizedId.includes('react-router-dom') || normalizedId.includes('react-dom') || normalizedId.includes('/react/')) {
            return 'react-vendor';
          }

          if (normalizedId.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
