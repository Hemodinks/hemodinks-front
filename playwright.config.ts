import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  workers: 4,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: [/.*\.mobile\.spec\.ts/, /.*\.cross-browser\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cross-browser-chromium',
      testMatch: /.*\.cross-browser\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cross-browser-firefox',
      testMatch: /.*\.cross-browser\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'cross-browser-webkit',
      testMatch: /.*\.cross-browser\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
  ],
});
