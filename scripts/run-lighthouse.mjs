import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { launch } from 'chrome-launcher';
import { chromium } from 'playwright';
import { preview } from 'vite';

const host = '127.0.0.1';
const port = 4173;
const origin = `http://${host}:${port}`;
const reportDirectory = join(process.cwd(), 'reports', 'lighthouse');
const routes = ['/dashboard', '/usuarios', '/pacientes', '/agenda'];
const thresholds = {
  accessibility: 0.95,
  bestPractices: 0.95,
  cumulativeLayoutShift: 0.1,
  largestContentfulPaintMs: 2_500,
  seo: 0.95,
};
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

function auditApiResponse(url) {
  const path = new URL(url).pathname;

  if (path === '/api/configuracoes-sistema/current') {
    return {
      id: 1,
      nomeEmpresa: 'Hemodinks',
      fotoEmpresa: null,
      dataCadastro: '2026-01-01T00:00:00Z',
      dataAtualizacao: null,
    };
  }
  if (path === '/api/dashboard/summary') {
    return {
      usersCount: 0,
      activeUsersCount: 0,
      pacientesCount: 0,
      activePatientsCount: 0,
      pendingPaymentsCount: 0,
      patientFilesCount: 0,
      upcomingEventsCount: 0,
    };
  }
  if (path === '/api/events/notification-recipients') {
    return {
      canNotifyAllAllowedRecipients: true,
      allRecipientsLabel: 'Todos os usuários permitidos',
      users: [],
      groups: [],
    };
  }
  if (path === '/api/licencas/current') {
    return { features: [], status: 'Ativa' };
  }
  if (path.includes('/medical-users') || path.includes('/medicos')) {
    return [];
  }
  if (path.startsWith('/api/events')) {
    return [];
  }
  if (
    path.startsWith('/api/users') ||
    path.startsWith('/api/pacientes') ||
    path.startsWith('/api/grupos-medicos')
  ) {
    return { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
  }
  return [];
}

function checkMinimum(result, route, category, minimum, required = false) {
  const value = score(result, category);
  const message = `${route} ${category}: ${(value * 100).toFixed(0)}% (mínimo ${(minimum * 100).toFixed(0)}%)`;

  if (value < minimum && required) {
    throw new Error(message);
  }

  console[value < minimum ? 'warn' : 'log'](message);
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

function checkMaximumAudit(result, route, auditId, label, maximum, unit = '') {
  const value = Number(result.lhr.audits[auditId]?.numericValue ?? Number.POSITIVE_INFINITY);
  const message = `${route} ${label}: ${value.toFixed(unit === 'ms' ? 0 : 3)}${unit} (máximo ${maximum}${unit})`;

  if (value > maximum) {
    throw new Error(message);
  }

  console.log(message);
}

async function stopChrome() {
  try {
    await chrome.kill();
  } catch (error) {
    const lockedPath = error?.code === 'EPERM' && typeof error.path === 'string' ? error.path : '';

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
  await context.route('**/api/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(auditApiResponse(route.request().url())),
    });
  });
  await context.addInitScript((auditSession) => {
    window.__HEMODINKS_AUDIT_SESSION__ = auditSession;
  }, session);

  for (const route of routes) {
    const result = await lighthouse(
      `${origin}${route}`,
      {
        port: chrome.port,
        output: ['html', 'json'],
        logLevel: 'error',
        disableStorageReset: true,
      },
      desktopConfig,
    );

    if (!result) {
      throw new Error(`Lighthouse não retornou resultado para ${route}.`);
    }

    const reports = Array.isArray(result.report) ? result.report : [result.report];
    await Promise.all([
      writeFile(join(reportDirectory, `${routeName(route)}.html`), reports[0]),
      writeFile(join(reportDirectory, `${routeName(route)}.json`), reports[1]),
    ]);

    checkMinimum(result, route, 'performance', 0.75);
    checkMinimum(result, route, 'accessibility', thresholds.accessibility, true);
    checkMinimum(result, route, 'best-practices', thresholds.bestPractices, true);
    checkMinimum(result, route, 'seo', thresholds.seo, true);
    checkMaximumAudit(
      result,
      route,
      'largest-contentful-paint',
      'LCP',
      thresholds.largestContentfulPaintMs,
      'ms',
    );
    checkMaximumAudit(
      result,
      route,
      'cumulative-layout-shift',
      'CLS',
      thresholds.cumulativeLayoutShift,
    );
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
