import { randomUUID } from 'node:crypto';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const appBuildId = randomUUID();

export default defineConfig(({ mode }) => ({
  define: { __APP_BUILD_ID__: JSON.stringify(appBuildId) },
  plugins: [
    {
      name: 'app-build-version',
      transformIndexHtml: () => [{
        tag: 'meta',
        attrs: { name: 'hemodinks-build-id', content: appBuildId },
        injectTo: 'head',
      }],
    },
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
    // App.*.test exercises complete authenticated form flows. Five seconds is
    // too close to the observed runtime under parallel CI load and made
    // unrelated cases fail nondeterministically without assertion failures.
    testTimeout: 10_000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Only `npm run test:coverage` (CI) enables this; `npm test` stays fast (#265).
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/setupTests.ts', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
      // Floor only for auth/session areas, a few points under the 2026-11-21 baseline
      // (services 87/87/74/85, auth 85/84/81/76 — lines/statements/functions/branches).
      thresholds: {
        'src/services/**': { lines: 85, statements: 85, functions: 70, branches: 80 },
        'src/features/auth/**': { lines: 80, statements: 80, functions: 75, branches: 70 },
      },
    },
  },
}));
