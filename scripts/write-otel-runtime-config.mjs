import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getFirstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function clampSampleRate(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 0), 1);
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function buildTraceExporterUrl() {
  const explicitTraceEndpoint = getFirstNonEmpty(
    process.env.VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  );

  if (explicitTraceEndpoint) {
    return explicitTraceEndpoint;
  }

  const baseEndpoint = getFirstNonEmpty(
    process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
    process.env.ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL,
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  );

  if (!baseEndpoint) {
    return '';
  }

  return `${ensureTrailingSlash(baseEndpoint)}v1/traces`;
}

const traceExporterUrl = buildTraceExporterUrl();
const runtimeConfig = {
  enabled: Boolean(traceExporterUrl),
  exporterEndpoint: traceExporterUrl,
  exporterHeaders: getFirstNonEmpty(
    process.env.VITE_OTEL_EXPORTER_OTLP_TRACES_HEADERS,
    process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS,
    process.env.VITE_OTEL_EXPORTER_OTLP_HEADERS,
    process.env.OTEL_EXPORTER_OTLP_HEADERS,
  ),
  serviceName: getFirstNonEmpty(process.env.VITE_OTEL_SERVICE_NAME) || 'hemodinks-front',
  serviceVersion: getFirstNonEmpty(process.env.VITE_APP_VERSION),
  environment: getFirstNonEmpty(process.env.VITE_APP_ENV, process.env.NODE_ENV),
  tracesSampleRate: clampSampleRate(process.env.VITE_OTEL_TRACES_SAMPLE_RATE),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.resolve(__dirname, '..', 'public');
const outputPath = path.join(publicDirectory, 'otel-runtime-config.json');

await mkdir(publicDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(runtimeConfig, null, 2)}\n`, 'utf8');
