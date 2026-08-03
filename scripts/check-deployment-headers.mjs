import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();

function read(...paths) {
  return paths
    .map((path) => readFileSync(resolve(projectRoot, path), 'utf8'))
    .join('\n')
    .toLowerCase();
}

const targets = [
  {
    name: 'Nginx',
    source: read('nginx-security-headers.conf', 'nginx.conf'),
  },
  {
    name: 'Render production',
    source: read('render.yaml'),
  },
  {
    name: 'Render confirmation',
    source: read('render.confirmation.yaml'),
  },
  {
    name: 'Vercel',
    source: read('vercel.json'),
  },
  {
    name: 'Azure Static Web Apps',
    source: read('public/staticwebapp.config.json'),
  },
];

const requiredSecurityHeaders = [
  'content-security-policy',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
];

const requiredCspRules = [
  "default-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
];

const requiredConnectSources = [
  'https://hemodinks-api-prod.politepond-d3524c51.brazilsouth.azurecontainerapps.io',
  'https://hemodinks-api-confirmation.onrender.com',
  'https://*.ingest.sentry.io',
  'https://*.ingest.us.sentry.io',
  'https://*.nr-data.net',
  'https://*.grafana.net',
  'https://*.applicationinsights.azure.com',
  'https://*.monitor.azure.com',
];

const errors = [];

function requireValue(target, value, description) {
  if (!target.source.includes(value)) {
    errors.push(`${target.name}: ${description}.`);
  }
}

for (const target of targets) {
  for (const header of requiredSecurityHeaders) {
    requireValue(target, header, `header ${header} ausente`);
  }

  if (target.source.includes('content-security-policy-report-only')) {
    errors.push(`${target.name}: CSP ainda está em Report-Only.`);
  }

  for (const rule of requiredCspRules) {
    requireValue(target, rule, `diretiva CSP ausente: ${rule}`);
  }

  for (const source of requiredConnectSources) {
    requireValue(target, source, `origem CSP ausente: ${source}`);
  }

  const connectSources =
    target.source
      .match(/connect-src\s+([^;]+)/)?.[1]
      ?.split(/\s+/)
      .filter(Boolean) ?? [];
  if (connectSources.includes('https:') || connectSources.includes('wss:')) {
    errors.push(`${target.name}: connect-src permite HTTPS irrestrito.`);
  }

  requireValue(target, '/index.html', 'política de cache do index ausente');
  requireValue(target, '/otel-runtime-config.json', 'política de cache do OTel ausente');
  requireValue(
    target,
    'no-cache, no-store, must-revalidate',
    'cache sensível não está desabilitado',
  );
  requireValue(target, '/assets/', 'política de cache dos assets ausente');
  requireValue(
    target,
    'public, max-age=31536000, immutable',
    'assets versionados não usam cache imutável',
  );
}

if (errors.length > 0) {
  console.error(`Falha na validação de headers (${errors.length} problema(s)):\n`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Headers de segurança e cache válidos em ${targets.length} destinos.`);
