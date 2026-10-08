import { sanitizeSpan } from './telemetryPrivacy';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ZoneContextManager } from '@opentelemetry/context-zone-peer-dep';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
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
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  tracesSampleRate?: number;
};

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let activeTracerProvider: WebTracerProvider | null = null;
let unregisterInstrumentations: (() => void) | null = null;

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

      const exporter = new OTLPTraceExporter({ url: runtimeConfig.exporterEndpoint });
      const tracerProvider = new WebTracerProvider({
        resource: resourceFromAttributes(resourceAttributes),
        sampler: new TraceIdRatioBasedSampler(clampSampleRate(runtimeConfig.tracesSampleRate)),
        spanProcessors: [
          new BatchSpanProcessor(
            { export: (spans, callback) => exporter.export(spans.map(sanitizeSpan), callback),
              shutdown: () => exporter.shutdown(), forceFlush: () => exporter.forceFlush() },
          ),
        ],
      });

      tracerProvider.register({
        contextManager: new ZoneContextManager(),
      });

      unregisterInstrumentations = registerInstrumentations({
        instrumentations: [
          new DocumentLoadInstrumentation(),
          new FetchInstrumentation({ ignoreUrls: [runtimeConfig.exporterEndpoint], propagateTraceHeaderCorsUrls: [] }),
        ],
      });

      activeTracerProvider = tracerProvider;
      initialized = true;
    })().catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('[otel] failed to initialize browser telemetry', error);
      }
    });
  }

  await initializationPromise;
}

export function hasInitializedOpenTelemetryBrowser() {
  return initialized;
}

export async function shutdownOpenTelemetryBrowser() {
  unregisterInstrumentations?.();
  unregisterInstrumentations = null;

  if (activeTracerProvider) {
    await activeTracerProvider.shutdown();
  }

  activeTracerProvider = null;
  initialized = false;
  initializationPromise = null;
}
