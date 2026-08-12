import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type AzureStaticWebAppsConfiguration = {
  globalHeaders?: Record<string, string>;
  navigationFallback?: { rewrite?: string };
  routes?: Array<{ route: string; headers?: Record<string, string> }>;
};

type VercelConfiguration = {
  git?: { deploymentEnabled?: boolean };
};

describe('configuração de deploy do Azure Static Web Apps', () => {
  it('entrega as rotas pela SPA com headers de segurança e cache', () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/staticwebapp.config.json'), 'utf8'),
    ) as AzureStaticWebAppsConfiguration;

    expect(configuration.navigationFallback?.rewrite).toBe('/index.html');
    expect(configuration.routes).toContainEqual({
      route: '/assets/*',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
    expect(configuration.globalHeaders?.['Content-Security-Policy'])
      .toContain('https://hemodinks-api-prod.politepond-d8524c51.brazilsouth.azurecontainerapps.io');
    expect(configuration.globalHeaders?.['X-Content-Type-Options']).toBe('nosniff');
  });

  it.each(['vercel.json', 'src/vercel.json'])('mantém os deploys da Vercel desabilitados em %s', (path) => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), path), 'utf8'),
    ) as VercelConfiguration;

    expect(configuration.git?.deploymentEnabled).toBe(false);
  });
});
