import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TUTORIAL_BASE_URL;

if (!baseURL) {
  throw new Error('Defina TUTORIAL_BASE_URL com a URL do ambiente de homologação.');
}

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  outputDir: 'artifacts/tutorials/test-results',
  expect: { timeout: 15_000 },
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'tutorial-auth',
      testMatch: /tutorials-auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], video: 'off' },
    },
    {
      name: 'tutorial-reports',
      testMatch: /tutorials-recording\.spec\.ts/,
      dependencies: ['tutorial-auth'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        video: { mode: 'on', size: { width: 1920, height: 1080 } },
      },
    },
  ],
});

