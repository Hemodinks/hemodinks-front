import { ZoneContextManager } from '@opentelemetry/context-zone-peer-dep';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, TraceIdRatioBasedSampler, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

type OTelRuntimeConfig = {
  enabled?: boolean;
  exporterEndpoint?: string;
  exporterHeaders?: string;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  tracesSampleRate?: number;
};

let initialized = false;
let initializationPromise: Promise<void> | null = null;

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseHeaders(rawHeaders?: string) {
  if (!rawHeaders?.trim()) {
    return undefined;
  }

  const headers = rawHeaders
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf('=');

      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (key && value) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function clampSampleRate(value?: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value ?? 1, 0), 1);
}

async function loadRuntimeConfig(): Promise<OTelRuntimeConfig | null> {
  try {
    const response = await fetch('/otel-runtime-config.json', { cache: 'no-store' });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OTelRuntimeConfig;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[otel] failed to load runtime config', error);
    }

    return null;
  }
}

function buildPropagateTraceHeaderCorsUrls() {
  const apiBaseUrl = getApiBaseUrl();
  return [new RegExp(`^${escapeRegex(apiBaseUrl)}`)];
}

export async function initOpenTelemetryBrowser() {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const runtimeConfig = await loadRuntimeConfig();

      if (!runtimeConfig?.enabled || !runtimeConfig.exporterEndpoint) {
        return;
      }

      const resourceAttributes: Record<string, string> = {
        [ATTR_SERVICE_NAME]: runtimeConfig.serviceName?.trim() || 'hemodinks-front',
      };

      if (runtimeConfig.serviceVersion?.trim()) {
        resourceAttributes[ATTR_SERVICE_VERSION] = runtimeConfig.serviceVersion.trim();
      }

      if (runtimeConfig.environment?.trim()) {
        resourceAttributes[ATTR_DEPLOYMENT_ENVIRONMENT_NAME] = runtimeConfig.environment.trim();
      }

      const tracerProvider = new WebTracerProvider({
        resource: resourceFromAttributes(resourceAttributes),
        sampler: new TraceIdRatioBasedSampler(clampSampleRate(runtimeConfig.tracesSampleRate)),
        spanProcessors: [
          new BatchSpanProcessor(
            new OTLPTraceExporter({
              url: runtimeConfig.exporterEndpoint,
              headers: parseHeaders(runtimeConfig.exporterHeaders),
            }),
          ),
        ],
      });

      tracerProvider.register({
        contextManager: new ZoneContextManager(),
      });

      registerInstrumentations({
        instrumentations: [
          new DocumentLoadInstrumentation(),
          new UserInteractionInstrumentation(),
          new FetchInstrumentation({
            ignoreUrls: [
              /\/otel-runtime-config\.json$/i,
              new RegExp(`^${escapeRegex(runtimeConfig.exporterEndpoint)}`),
            ],
            propagateTraceHeaderCorsUrls: buildPropagateTraceHeaderCorsUrls(),
          }),
        ],
      });

      initialized = true;
    })().catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('[otel] failed to initialize browser telemetry', error);
      }
    });
  }

  await initializationPromise;
}
