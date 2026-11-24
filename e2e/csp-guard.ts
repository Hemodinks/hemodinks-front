import { expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { buildCsp } from '../scripts/security-headers.mjs';

// #310: com E2E_CSP=1 (playwright.csp.config.ts) o build de produção é servido com a mesma CSP de
// security-headers.json; só a API simulada entra em connect-src/img-src, como o Render na homologação.
// Qualquer violação reprova o teste.
export const CSP_E2E_ENABLED = process.env.E2E_CSP === '1';
const MOCK_API_ORIGIN = 'http://localhost:5000';

type CanonicalHeaders = { contentSecurityPolicy: Record<string, string[]>; headers: Record<string, string> };

function testCsp() {
  const canonical = JSON.parse(readFileSync(new URL('../security-headers.json', import.meta.url), 'utf8')) as CanonicalHeaders;
  // upgrade-insecure-requests trocaria o http da API simulada por https; o resto é idêntico à produção.
  const { 'upgrade-insecure-requests': _upgrade, ...directives } = canonical.contentSecurityPolicy;
  return {
    csp: buildCsp(directives, { 'connect-src': [MOCK_API_ORIGIN], 'img-src': [MOCK_API_ORIGIN] }),
    headers: canonical.headers,
  };
}

export async function enforceProductionCsp(page: Page, baseURL: string | undefined) {
  if (!CSP_E2E_ENABLED || !baseURL) return;
  const { csp, headers } = testCsp();
  const appOrigin = new URL(baseURL).origin;
  await page.route(url => url.origin === appOrigin, async route => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    // vite preview pode resetar a conexão sob carga paralela; uma nova tentativa não mascara violação de CSP.
    const response = await route.fetch().catch(() => route.fetch());
    await route.fulfill({ response, headers: { ...response.headers(), ...headers, 'content-security-policy': csp } });
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = violations;
    document.addEventListener('securitypolicyviolation', event => {
      violations.push(`${event.effectiveDirective} bloqueou ${event.blockedURI || 'inline'} (${event.sourceFile}:${event.lineNumber})`);
    });
  });
}

export async function expectNoCspViolations(page: Page, testInfo: TestInfo) {
  if (!CSP_E2E_ENABLED || page.isClosed()) return;
  const violations = await page.evaluate(() =>
    (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []).catch(() => [] as string[]);
  if (violations.length) await testInfo.attach('csp-violations', { body: violations.join('\n') });
  expect(violations, 'Violações de CSP no build de produção').toEqual([]);
}
