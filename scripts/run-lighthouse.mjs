import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';
import { preview } from 'vite';

const host = '127.0.0.1';
const port = 4173;
const origin = `http://${host}:${port}`;
const reportDirectory = join(process.cwd(), 'reports', 'lighthouse');
const routes = ['/dashboard', '/usuarios', '/pacientes', '/agenda'];
const session = {
  token: 'lighthouse-token',
  user: {
    id: 99,
    nome: 'Lighthouse Admin',
    email: 'lighthouse@hemodinks.local',
    cpf: '00000000191',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
  },
};

function routeName(route) {
  return route.replace(/^\//, '') || 'index';
}

function score(result, category) {
  return result.lhr.categories[category]?.score ?? 0;
}

function checkMinimum(result, route, category, minimum, required = false) {
  const value = score(result, category);
  const message = `${route} ${category}: ${(value * 100).toFixed(0)}% (mínimo ${(minimum * 100).toFixed(0)}%)`;

  if (value < minimum && required) {
    throw new Error(message);
  }

  console[ value < minimum ? 'warn' : 'log' ](message);
}

function checkScriptBudget(result, route) {
  const script = result.lhr.audits['resource-summary']?.details?.items?.find(
    (item) => item.resourceType === 'script',
  );
  const size = Number(script?.transferSize ?? 0);
  const maximum = 650_000;
  const message = `${route} scripts: ${(size / 1024).toFixed(1)} kB (limite ${(maximum / 1024).toFixed(1)} kB)`;
  console[size > maximum ? 'warn' : 'log'](message);
}

async function stopChrome() {
  try {
    await chrome.kill();
  } catch (error) {
    const lockedPath = error?.code === 'EPERM' && typeof error.path === 'string'
      ? error.path
      : '';

    if (!/^lighthouse\.\d+$/.test(basename(lockedPath))) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    await rm(lockedPath, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 250,
    });
  }
}

let server;
let chrome;
let browser;

try {
  await mkdir(reportDirectory, { recursive: true });
  server = await preview({ preview: { host, port, strictPort: true } });
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox'],
  });
  browser = await chromium.connectOverCDP(`http://${host}:${chrome.port}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.evaluate((storedSession) => {
    localStorage.setItem('hemodinks.session', JSON.stringify(storedSession));
  }, session);
  await page.close();

  for (const route of routes) {
    const result = await lighthouse(`${origin}${route}`, {
      port: chrome.port,
      output: ['html', 'json'],
      logLevel: 'error',
      disableStorageReset: true,
    });

    if (!result) {
      throw new Error(`Lighthouse não retornou resultado para ${route}.`);
    }

    const reports = Array.isArray(result.report) ? result.report : [result.report];
    await Promise.all([
      writeFile(join(reportDirectory, `${routeName(route)}.html`), reports[0]),
      writeFile(join(reportDirectory, `${routeName(route)}.json`), reports[1]),
    ]);

    checkMinimum(result, route, 'performance', 0.75);
    checkMinimum(result, route, 'accessibility', 0.9, true);
    checkMinimum(result, route, 'best-practices', 0.9);
    checkMinimum(result, route, 'seo', 0.8);
    checkScriptBudget(result, route);
  }
} finally {
  if (chrome) {
    await stopChrome();
  } else {
    await browser?.close();
  }
  if (server) {
    await new Promise((resolve) => server.httpServer.close(resolve));
  }
}
