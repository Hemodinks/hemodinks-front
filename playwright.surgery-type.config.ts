import { defineConfig, devices } from '@playwright/test';
import responsive from './playwright.responsive.config';

// Reuse the isolated HTTP fixtures and telemetry-disabled local server.
export default defineConfig({
  ...responsive,
  grep: /issue173:/,
  outputDir: 'test-results/surgery-type',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/surgery-type', open: 'never' }]],
  projects: [
    { name: 'surgery-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'surgery-notebook', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'surgery-tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'surgery-mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
