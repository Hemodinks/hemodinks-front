import { defineConfig, devices } from '@playwright/test';

if (!process.env.HEMODINKS_REAL_FIXTURE || process.env.VITE_API_URL !== 'http://127.0.0.1:5193') {
  throw new Error('Use npm run test:e2e:real to provision the isolated API and database.');
}

export default defineConfig({
  testDir: './e2e/real-api',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['json', { outputFile: 'test-results/real-api/results.json' }]],
  outputDir: 'test-results/real-api/browser',
  // Tokens, refresh cookies and authenticated response bodies must not enter traces/HAR/video.
  use: { baseURL: 'http://127.0.0.1:5194', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5194 --strictPort',
    url: 'http://127.0.0.1:5194',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
