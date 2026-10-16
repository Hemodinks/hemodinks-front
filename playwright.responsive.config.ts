import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// Keep the full suite desktop-only. This bounded matrix reuses its safe fixtures.
export default defineConfig({
  ...base,
  testMatch: '**/hemodinks.spec.ts',
  grep: /responsive #163:|tenant #162:|bloqueia rota de usuarios para perfil paciente|protege relatórios com a autorização provisória/,
  forbidOnly: true,
  failOnFlakyTests: true,
  workers: 1,
  outputDir: 'test-results/responsive',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/responsive', open: 'never' }],
    ['json', { outputFile: 'playwright-report/responsive-results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_API_URL: 'http://localhost:5000',
      VITE_SENTRY_DSN: '',
      VITE_SENTRY_TRACES_SAMPLE_RATE: '0',
      VITE_APP_ENV: 'test',
      VITE_NEW_RELIC_APPLICATION_ID: '',
      VITE_NEW_RELIC_AGENT_ID: '',
      VITE_NEW_RELIC_ACCOUNT_ID: '',
      VITE_NEW_RELIC_LICENSE_KEY: '',
      VITE_NEW_RELIC_TRUST_KEY: '',
      VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '',
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '',
      VITE_OTEL_EXPORTER_OTLP_ENDPOINT: '',
      ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL: '',
      OTEL_EXPORTER_OTLP_ENDPOINT: '',
    },
  },
  projects: [
    { name: 'responsive-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'responsive-tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
    { name: 'responsive-mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
