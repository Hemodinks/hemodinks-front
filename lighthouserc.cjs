const { chromium } = require('playwright');

module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      isSinglePageApplication: true,
      chromePath: chromium.executablePath(),
      url: [
        'http://localhost/dashboard',
        'http://localhost/usuarios',
        'http://localhost/pacientes',
        'http://localhost/agenda',
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
