import type { OpenTelemetryRuntimeConfig } from './telemetryTypes';

type TelemetryEnvironment = Record<string, string | boolean | undefined>;

export function hasCompleteNewRelicConfig(environment: TelemetryEnvironment) {
  return [
    environment.VITE_NEW_RELIC_APPLICATION_ID,
    environment.VITE_NEW_RELIC_AGENT_ID,
    environment.VITE_NEW_RELIC_ACCOUNT_ID,
    environment.VITE_NEW_RELIC_LICENSE_KEY,
  ].every((value) => typeof value === 'string' && Boolean(value.trim()));
}

export async function loadOpenTelemetryRuntimeConfig(
  request: typeof fetch = fetch,
): Promise<OpenTelemetryRuntimeConfig | null> {
  try {
    const response = await request('/otel-runtime-config.json', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OpenTelemetryRuntimeConfig;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[otel] failed to load runtime config', error);
    }
    return null;
  }
}

export async function initializeOptionalTelemetry() {
  const initializers: Promise<unknown>[] = [];

  if (hasCompleteNewRelicConfig(import.meta.env)) {
    initializers.push(
      import('./newRelic').then(({ initNewRelicBrowser }) => initNewRelicBrowser()),
    );
  }

  initializers.push(
    loadOpenTelemetryRuntimeConfig().then((runtimeConfig) => {
      if (!runtimeConfig?.enabled || !runtimeConfig.exporterEndpoint?.trim()) {
        return undefined;
      }

      return import('./otel').then(({ initOpenTelemetryBrowser }) =>
        initOpenTelemetryBrowser(runtimeConfig),
      );
    }),
  );

  await Promise.allSettled(initializers);
}
