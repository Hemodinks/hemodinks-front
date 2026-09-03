let analyticsStarted = false;

export async function startOptionalAnalytics() {
  if (analyticsStarted) return;
  analyticsStarted = true;

  const [{ initNewRelicBrowser }, { initObservability }, { initOpenTelemetryBrowser }] = await Promise.all([
    import('../../newRelic'),
    import('../../observability'),
    import('../../otel'),
  ]);

  initNewRelicBrowser();
  initObservability();
  await initOpenTelemetryBrowser();
}

export function hasStartedOptionalAnalytics() {
  return analyticsStarted;
}
