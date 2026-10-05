import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const base = process.env.SECURITY_HOST_URL;
assert(base);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const response = await page.goto(base);
  const headers = response.headers();
  assert.match(headers['content-security-policy'], /script-src 'self';/);
  assert(!headers['content-security-policy'].includes('unsafe-eval'));
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['referrer-policy'], 'no-referrer');
  const asset = await page.locator('script[src]').first().getAttribute('src');
  for (const path of ['/pacientes', '/reset-password?token=PRIVATE_QUERY_SENTINEL', '/assets/missing-security-test.js', asset]) {
    const result = await page.request.get(new URL(path, base).href);
    assert.equal(result.headers()['content-security-policy'], headers['content-security-policy']);
  }
  const outcome = await page.evaluate(async () => {
    const script = document.createElement('script');
    script.textContent = 'window.__xssExecuted = true';
    document.body.append(script);
    const externalBlocked = await new Promise(resolve => {
      const external = document.createElement('script');
      external.src = 'https://untrusted.invalid/payload.js';
      external.onerror = () => resolve(true); external.onload = () => resolve(false);
      document.body.append(external);
    });
    let evalBlocked = false;
    try { new Function('window.__xssExecuted = true')(); } catch { evalBlocked = true; }
    return { externalBlocked, evalBlocked, inlineExecuted: Boolean(window.__xssExecuted) };
  });
  assert.deepEqual(outcome, { externalBlocked: true, evalBlocked: true, inlineExecuted: false });
  console.log('PASS: Nginx actual HTTP headers on SPA/assets/404; Chromium blocks inline, eval and untrusted scripts.');
} finally { await browser.close(); }
