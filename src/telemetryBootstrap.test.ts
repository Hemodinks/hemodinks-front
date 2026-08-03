import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hasCompleteNewRelicConfig,
  initializeOptionalTelemetry,
  loadOpenTelemetryRuntimeConfig,
} from './telemetryBootstrap';

const telemetryMocks = vi.hoisted(() => ({
  initNewRelicBrowser: vi.fn(),
  initOpenTelemetryBrowser: vi.fn(),
}));

vi.mock('./newRelic', () => ({ initNewRelicBrowser: telemetryMocks.initNewRelicBrowser }));
vi.mock('./otel', () => ({
  initOpenTelemetryBrowser: telemetryMocks.initOpenTelemetryBrowser,
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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

  it('ignora configuração indisponível ou resposta inválida', async () => {
    await expect(
      loadOpenTelemetryRuntimeConfig(vi.fn().mockResolvedValue({ ok: false })),
    ).resolves.toBeNull();
    await expect(
      loadOpenTelemetryRuntimeConfig(vi.fn().mockRejectedValue(new Error('offline'))),
    ).resolves.toBeNull();
  });

  it('inicializa New Relic e OpenTelemetry quando ambos estão configurados', async () => {
    vi.stubEnv('VITE_NEW_RELIC_APPLICATION_ID', 'app');
    vi.stubEnv('VITE_NEW_RELIC_AGENT_ID', 'agent');
    vi.stubEnv('VITE_NEW_RELIC_ACCOUNT_ID', 'account');
    vi.stubEnv('VITE_NEW_RELIC_LICENSE_KEY', 'license');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            enabled: true,
            exporterEndpoint: 'https://otel.example/v1/traces',
          }),
      }),
    );

    await initializeOptionalTelemetry();

    expect(telemetryMocks.initNewRelicBrowser).toHaveBeenCalledOnce();
    expect(telemetryMocks.initOpenTelemetryBrowser).toHaveBeenCalledWith(
      expect.objectContaining({ exporterEndpoint: 'https://otel.example/v1/traces' }),
    );
  });

  it('não carrega o SDK OpenTelemetry quando o runtime está desativado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ enabled: false, exporterEndpoint: '' }),
      }),
    );

    await initializeOptionalTelemetry();

    expect(telemetryMocks.initOpenTelemetryBrowser).not.toHaveBeenCalled();
  });
});
