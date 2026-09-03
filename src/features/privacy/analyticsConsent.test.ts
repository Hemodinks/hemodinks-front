import { beforeEach, describe, expect, it, vi } from 'vitest';

const telemetry = vi.hoisted(() => ({
  initNewRelicBrowser: vi.fn(),
  initObservability: vi.fn(),
  initOpenTelemetryBrowser: vi.fn(async () => undefined),
  disableObservability: vi.fn(async () => undefined),
  shutdownOpenTelemetryBrowser: vi.fn(async () => undefined),
}));

vi.mock('../../newRelic', () => ({
  initNewRelicBrowser: telemetry.initNewRelicBrowser,
  hasInitializedNewRelicBrowser: vi.fn(() => false),
}));

vi.mock('../../observability', () => ({
  initObservability: telemetry.initObservability,
  disableObservability: telemetry.disableObservability,
}));

vi.mock('../../otel', () => ({
  initOpenTelemetryBrowser: telemetry.initOpenTelemetryBrowser,
  shutdownOpenTelemetryBrowser: telemetry.shutdownOpenTelemetryBrowser,
  hasInitializedOpenTelemetryBrowser: vi.fn(() => false),
}));

describe('optional analytics consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('não inicializa telemetria quando análise permanece desativada', async () => {
    const { stopOptionalAnalytics, hasStartedOptionalAnalytics } = await import('./analyticsConsent');

    await stopOptionalAnalytics();

    expect(hasStartedOptionalAnalytics()).toBe(false);
    expect(telemetry.initNewRelicBrowser).not.toHaveBeenCalled();
    expect(telemetry.initObservability).not.toHaveBeenCalled();
    expect(telemetry.initOpenTelemetryBrowser).not.toHaveBeenCalled();
  });

  it('inicializa todas as integrações opcionais somente após autorização', async () => {
    const { startOptionalAnalytics, hasStartedOptionalAnalytics } = await import('./analyticsConsent');

    await startOptionalAnalytics();

    expect(telemetry.initNewRelicBrowser).toHaveBeenCalledOnce();
    expect(telemetry.initObservability).toHaveBeenCalledOnce();
    expect(telemetry.initOpenTelemetryBrowser).toHaveBeenCalledOnce();
    expect(hasStartedOptionalAnalytics()).toBe(true);
  });

  it('desabilita integrações que suportam encerramento após revogação', async () => {
    const { startOptionalAnalytics, stopOptionalAnalytics, hasStartedOptionalAnalytics } = await import('./analyticsConsent');
    await startOptionalAnalytics();

    const result = await stopOptionalAnalytics();

    expect(telemetry.disableObservability).toHaveBeenCalledOnce();
    expect(telemetry.shutdownOpenTelemetryBrowser).toHaveBeenCalledOnce();
    expect(result.requiresReload).toBe(false);
    expect(hasStartedOptionalAnalytics()).toBe(false);
  });
});
