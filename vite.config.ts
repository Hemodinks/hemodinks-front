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
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
