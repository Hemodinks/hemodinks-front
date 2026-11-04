import { beforeEach, describe, expect, it, vi } from 'vitest';

const telemetry = vi.hoisted(() => ({
  initNewRelicBrowser: vi.fn(),
  hasInitializedNewRelicBrowser: vi.fn(() => false),
}));

vi.mock('../../newRelic', () => ({
  initNewRelicBrowser: telemetry.initNewRelicBrowser,
  hasInitializedNewRelicBrowser: telemetry.hasInitializedNewRelicBrowser,
}));

describe('optional analytics consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    telemetry.hasInitializedNewRelicBrowser.mockReturnValue(false);
  });

  it('não inicializa telemetria quando análise permanece desativada', async () => {
    const { stopOptionalAnalytics, hasStartedOptionalAnalytics } = await import('./analyticsConsent');

    await stopOptionalAnalytics();

    expect(hasStartedOptionalAnalytics()).toBe(false);
    expect(telemetry.initNewRelicBrowser).not.toHaveBeenCalled();
  });

  it('inicializa o New Relic somente após autorização', async () => {
    const { startOptionalAnalytics, hasStartedOptionalAnalytics } = await import('./analyticsConsent');

    await startOptionalAnalytics();

    expect(telemetry.initNewRelicBrowser).toHaveBeenCalledOnce();
    expect(hasStartedOptionalAnalytics()).toBe(true);
  });

  it('encerra a análise após revogação sem recarregar quando o New Relic não iniciou', async () => {
    const { startOptionalAnalytics, stopOptionalAnalytics, hasStartedOptionalAnalytics } = await import('./analyticsConsent');
    await startOptionalAnalytics();

    const result = await stopOptionalAnalytics();

    expect(result.requiresReload).toBe(false);
    expect(hasStartedOptionalAnalytics()).toBe(false);
  });

  it('pede recarga após revogação quando o New Relic já está ativo', async () => {
    const { startOptionalAnalytics, stopOptionalAnalytics } = await import('./analyticsConsent');
    await startOptionalAnalytics();
    telemetry.hasInitializedNewRelicBrowser.mockReturnValue(true);

    const result = await stopOptionalAnalytics();

    expect(result.requiresReload).toBe(true);
  });
});
