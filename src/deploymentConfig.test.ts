import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORM_VIEWS, VIEW_PATHS } from './routes';

type AzureStaticWebAppsConfiguration = {
  globalHeaders?: Record<string, string>;
  navigationFallback?: { rewrite?: string };
  routes?: Array<{ route: string; headers?: Record<string, string> }>;
};

type VercelConfiguration = {
  git?: { deploymentEnabled?: boolean | Record<string, boolean> };
  headers?: Array<{ headers: Array<{ key: string; value: string }> }>;
  rewrites?: Array<{ source: string; destination: string; permanent?: boolean }>;
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
    const contentSecurityPolicy = configuration.globalHeaders?.['Content-Security-Policy'] ?? '';
    expect(contentSecurityPolicy)
      .toContain('https://hemodinks-api-prod.politepond-d8524c51.brazilsouth.azurecontainerapps.io');
    expect(contentSecurityPolicy).toContain("script-src 'self';");
    expect(contentSecurityPolicy).toContain('https://date.nager.at');
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy).not.toContain('http://localhost:');
    expect(contentSecurityPolicy).not.toContain('onrender.com');
    expect(configuration.globalHeaders?.['X-Content-Type-Options']).toBe('nosniff');
  });

  it('não indexa as telas internas em produção', () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/staticwebapp.config.json'), 'utf8'),
    ) as AzureStaticWebAppsConfiguration;

    const formRoutes = FORM_VIEWS.map((view) => `${VIEW_PATHS[view]}/*`);
    for (const route of [...Object.values(VIEW_PATHS), ...formRoutes, '/configuracoes']) {
      // A rota recebe o HTML do fallback: mantém o mesmo "sem cache" de /index.html,
      // senão o Azure aplica max-age=30 e links diretos podem servir HTML desatualizado após deploy.
      expect(configuration.routes, route).toContainEqual({
        route,
        headers: {
          'X-Robots-Tag': 'noindex, nofollow',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    const publicRoutes = ['/', '/index.html', '/termos-de-uso', '/politica-de-privacidade'];
    const noindexRoutes = configuration.routes
      ?.filter((entry) => entry.headers?.['X-Robots-Tag'])
      .map((entry) => entry.route) ?? [];
    expect(noindexRoutes.filter((route) => publicRoutes.includes(route))).toEqual([]);
    expect(configuration.globalHeaders?.['X-Robots-Tag']).toBeUndefined();
  });

  it('nunca indexa a homologação da Vercel', () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as VercelConfiguration;

    const robotsHeader = configuration.headers
      ?.flatMap((entry) => entry.headers)
      .find((header) => header.key === 'X-Robots-Tag');
    expect(robotsHeader?.value).toBe('noindex, nofollow');
  });

  it('habilita na Vercel somente a homologação da branch developer', () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as VercelConfiguration;

    expect(configuration.git?.deploymentEnabled).toEqual({
      '*': false,
      developer: true,
    });
    expect(configuration.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/index.html',
    });
    expect(configuration.rewrites?.every((rewrite) => rewrite.permanent == null)).toBe(true);
    const contentSecurityPolicy = configuration.headers
      ?.flatMap((entry) => entry.headers)
      .find((header) => header.key === 'Content-Security-Policy');
    expect(contentSecurityPolicy?.value).toContain('https://hemodinks-api-1-90nb.onrender.com');
    expect(contentSecurityPolicy?.value).not.toContain('https://hemodinks-api-confirmation.onrender.com');
    expect(contentSecurityPolicy?.value).toContain("script-src 'self';");
    expect(contentSecurityPolicy?.value).toContain('https://date.nager.at');
    expect(contentSecurityPolicy?.value).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy?.value).not.toContain('http://localhost:');
  });

  it('mantém desabilitado o projeto Vercel legado de produção', () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/vercel.json'), 'utf8'),
    ) as VercelConfiguration;

    expect(configuration.git?.deploymentEnabled).toBe(false);
  });

  it('não libera APIs do Render na CSP das imagens nginx', () => {
    for (const file of ['nginx.conf', 'nginx.proxy.conf.template']) {
      const configuration = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(configuration, file).toContain('Content-Security-Policy');
      expect(configuration, file).not.toContain('onrender.com');
    }
  });
});
