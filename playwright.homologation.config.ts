import { defineConfig } from '@playwright/test';
import base from './playwright.config';
process.env.VITE_LOGIN_PREPARATION_ENABLED = 'true';
export default defineConfig(base, {
  grep: /homologation preparation:/,
  use: { baseURL: 'http://127.0.0.1:5178' },
  webServer: {
    command: 'npm run dev -- --port 5178',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_LOGIN_PREPARATION_ENABLED: 'true' },
  },
});
