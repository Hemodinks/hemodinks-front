// Run after npm run build: node scripts/test-app-update.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:5186';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5186', '--strictPort'], { windowsHide: true });
let serverLog = '';
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverLog);
    try { ready = (await fetch(origin)).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert(ready, 'Production preview did not start');
  browser = await chromium.launch();
  const currentPage = await browser.newPage();
  await currentPage.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== origin) {
      await route.fulfill({ contentType: 'application/json', body: '{}' });
    } else await route.continue();
  });
  const currentCheck = currentPage.waitForResponse(response => response.url().includes('app-version-check='));
  await currentPage.goto(origin);
  await currentCheck;
  await expect(currentPage.getByRole('button', { name: 'Atualizar sistema', exact: true })).toHaveCount(0);
  assert(await currentPage.locator('meta[name="hemodinks-build-id"]').getAttribute('content'));
  await currentPage.close();
  console.log('PASS: current production build does not display a false update');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    let checks = 0;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } else if (url.searchParams.has('app-version-check')) {
        checks++;
        await route.fulfill({ contentType: 'text/html', body: '<meta name="hemodinks-build-id" content="next-version">' });
      } else await route.continue();
    });
    // Hold the response until a real field contains an unsaved draft.
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/index.html?app-version-check=*', async route => {
      checks++;
      await gate;
      await route.fulfill({ contentType: 'text/html', body: '<meta name="hemodinks-build-id" content="next-version">' });
    });
    await page.goto(origin);
    const email = page.locator('input[type="email"]');
    await email.fill('rascunho@example.com');
    release();
    const update = page.getByRole('button', { name: 'Atualizar sistema', exact: true });
    await expect(update).toBeVisible();
    await expect(email).toHaveValue('rascunho@example.com');
    assert.equal(checks, 1);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Horizontal overflow');
    await update.click();
    await expect(page.getByRole('dialog', { name: 'Atualizar sistema?' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar trabalhando' }).click();
    await expect(email).toHaveValue('rascunho@example.com');
    await expect(update).toBeFocused();
    await update.click();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Atualizar agora' }).click(),
    ]);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: update notice, preserved draft, cancel, confirmed reload, no overflow/runtime errors at ' + viewport.width + 'px');
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
