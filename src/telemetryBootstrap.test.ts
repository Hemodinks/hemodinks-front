import { describe, expect, it, vi } from 'vitest';
import { hasCompleteNewRelicConfig, loadOpenTelemetryRuntimeConfig } from './telemetryBootstrap';

describe('telemetry bootstrap', () => {
  it('somente habilita New Relic quando a configuração obrigatória está completa', () => {
    expect(hasCompleteNewRelicConfig({})).toBe(false);
    expect(
      hasCompleteNewRelicConfig({
        VITE_NEW_RELIC_APPLICATION_ID: 'app',
        VITE_NEW_RELIC_AGENT_ID: 'agent',
        VITE_NEW_RELIC_ACCOUNT_ID: 'account',
        VITE_NEW_RELIC_LICENSE_KEY: '',
      }),
    ).toBe(false);
    expect(
      hasCompleteNewRelicConfig({
        VITE_NEW_RELIC_APPLICATION_ID: 'app',
        VITE_NEW_RELIC_AGENT_ID: 'agent',
        VITE_NEW_RELIC_ACCOUNT_ID: 'account',
        VITE_NEW_RELIC_LICENSE_KEY: 'license',
      }),
    ).toBe(true);
  });

  it('lê a configuração leve do OpenTelemetry antes do módulo pesado', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          enabled: true,
          exporterEndpoint: 'https://otel.example/v1/traces',
        }),
    });

    await expect(loadOpenTelemetryRuntimeConfig(request)).resolves.toEqual({
      enabled: true,
      exporterEndpoint: 'https://otel.example/v1/traces',
    });
    expect(request).toHaveBeenCalledWith('/otel-runtime-config.json', { cache: 'no-store' });
  });
});
