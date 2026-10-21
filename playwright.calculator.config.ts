import { defineConfig, devices } from '@playwright/test';
import responsive from './playwright.responsive.config';
export default defineConfig({
  ...responsive,
  grep: /issue175:/,
  outputDir: 'test-results/calculator',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/calculator', open: 'never' }], ['json', { outputFile: 'playwright-report/calculator.json' }]],
  projects: [
    { name: 'calculator-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'calculator-notebook', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'calculator-tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'calculator-mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
