let analyticsStarted = false;
let analyticsAllowed = false;
let startPromise: Promise<void> | null = null;

export async function startOptionalAnalytics() {
  analyticsAllowed = true;
  if (analyticsStarted) return;

  if (startPromise) {
    await startPromise;
    return;
  }

  startPromise = (async () => {
    const [{ initNewRelicBrowser }, { initObservability }, { initOpenTelemetryBrowser }] = await Promise.all([
      import('../../newRelic'),
      import('../../observability'),
      import('../../otel'),
    ]);

    if (!analyticsAllowed) return;

    initNewRelicBrowser();
    initObservability();
    await initOpenTelemetryBrowser();

    analyticsStarted = analyticsAllowed;
  })().finally(() => {
    startPromise = null;
  });

  await startPromise;
}

export async function stopOptionalAnalytics() {
  analyticsAllowed = false;
  await startPromise;

  if (!analyticsStarted) {
    return { requiresReload: false };
  }

  const [newRelic, observability, otel] = await Promise.all([
    import('../../newRelic'),
    import('../../observability'),
    import('../../otel'),
  ]);
  const requiresReload = newRelic.hasInitializedNewRelicBrowser()
    || otel.hasInitializedOpenTelemetryBrowser();

  await Promise.all([
    observability.disableObservability(),
    otel.shutdownOpenTelemetryBrowser(),
  ]);
  analyticsStarted = false;

  return { requiresReload };
}

export function hasStartedOptionalAnalytics() {
  return analyticsStarted;
}
