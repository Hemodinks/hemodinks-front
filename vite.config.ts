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
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('@sentry/react')) {
            return 'observability';
          }

          if (
            id.includes('react-router-dom') ||
            id.includes('react-dom') ||
            id.includes('/react/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Keep local and CI runs within the same worker envelope. The full suite is
    // UI-heavy and could starve Testing Library's async queries when Vitest
    // created one worker per available CPU, while the same tests passed alone.
    maxWorkers: 2,
    setupFiles: './src/setupTests.ts',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/setupTests.ts',
        'src/test/**',
      ],
      thresholds: {
        statements: 77,
        branches: 70,
        functions: 72,
        lines: 79,
      },
    },
  },
}));
