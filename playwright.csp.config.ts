import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
import responsive from './playwright.responsive.config';

// #310: E2E desktop e matriz responsiva contra o BUILD DE PRODUÇÃO (vite preview) com a CSP de
// security-headers.json (e2e/csp-guard.ts). O dev server do Vite injeta <style> e não serve para isso.
process.env.E2E_CSP = '1';
const PORT = 5176;

export default defineConfig({
  ...base,
  testMatch: '**/hemodinks.spec.ts',
  outputDir: 'test-results/csp',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/csp', open: 'never' }]],
  // O service worker do PWA (só existe no build) serviria chunks do cache por fora do page.route dos testes.
  use: { ...base.use, baseURL: `http://127.0.0.1:${PORT}`, serviceWorkers: 'block' },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      VITE_API_URL: 'http://localhost:5000',
      VITE_APP_ENV: 'test',
      VITE_NEW_RELIC_APPLICATION_ID: '',
      VITE_NEW_RELIC_AGENT_ID: '',
      VITE_NEW_RELIC_ACCOUNT_ID: '',
      VITE_NEW_RELIC_LICENSE_KEY: '',
      VITE_NEW_RELIC_TRUST_KEY: '',
    },
  },
  projects: [
    { name: 'csp-desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'csp-mobile',
      grep: responsive.grep,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
});
