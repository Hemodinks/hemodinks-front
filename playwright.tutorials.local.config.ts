import { defineConfig, devices } from '@playwright/test';

process.env.TUTORIAL_LOCAL_RECORDING = '1';

export default defineConfig({
  testDir: './e2e',
  testMatch: /hemodinks\.spec\.ts/,
  grep: /grava tutorial local de relatórios/,
  timeout: 120_000,
  outputDir: 'artifacts/tutorials/playwright-local-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1920, height: 1080 },
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
