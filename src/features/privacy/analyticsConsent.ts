
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
    const { initNewRelicBrowser } = await import('../../newRelic');

    if (!analyticsAllowed) return;

    initNewRelicBrowser();

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

  const newRelic = await import('../../newRelic');
  const requiresReload = newRelic.hasInitializedNewRelicBrowser();
  analyticsStarted = false;

  return { requiresReload };
}

export function hasStartedOptionalAnalytics() {
  return analyticsStarted;
}
