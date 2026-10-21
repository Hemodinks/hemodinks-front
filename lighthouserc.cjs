const { chromium } = require('playwright');

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/lighthouse-server.cjs',
      startServerReadyPattern: 'Lighthouse fixture server ready',
      chromePath: chromium.executablePath(),
      url: [
        'http://127.0.0.1:5199/dashboard',
        'http://127.0.0.1:5199/usuarios',
        'http://127.0.0.1:5199/pacientes',
        'http://127.0.0.1:5199/agenda',
      ],
      numberOfRuns: 1,
      puppeteerScript: './scripts/lighthouse-auth.cjs',
      puppeteerLaunchOptions: {
        args: ['--headless=new', '--no-sandbox'],
      },
      settings: {
        disableStorageReset: true,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.75 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'resource-summary:script:size': ['warn', { maxNumericValue: 650000 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './reports/lighthouse',
    },
  },
};
