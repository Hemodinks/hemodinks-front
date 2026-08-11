import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type VercelConfiguration = {
  headers?: Array<{ headers: Array<{ key: string; value: string }> }>;
  redirects?: Array<{ source: string; destination: string }>;
  rewrites?: Array<{ source: string; destination: string }>;
};

describe('configuração de deploy da Vercel', () => {
  it('mantém cada ambiente no próprio domínio e entrega as rotas pela SPA', () => {
    const configuration = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as VercelConfiguration;

    expect(configuration.redirects ?? []).toEqual([]);
    expect(configuration.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/index.html',
    });
    const contentSecurityPolicy = configuration.headers
      ?.flatMap((entry) => entry.headers)
      .find((header) => header.key === 'Content-Security-Policy');
    expect(contentSecurityPolicy?.value).toContain('https://hemodinks-api-confirmation.onrender.com');
  });
});
