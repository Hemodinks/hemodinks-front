import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Reuse complete user journeys without multiplying the existing viewport loops.
export default defineConfig({
  ...base,
  testMatch: 'hemodinks.spec.ts',
  grep: /faz login pelo formulario|cadastra com novos vínculos|consulta e exporta relatórios com filtros múltiplos|tenant #162: Pacientes não reutiliza|tenant #163: resposta negada/,
  outputDir: 'test-results-responsive',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-responsive', open: 'never' }]],
  use: { ...base.use, screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
