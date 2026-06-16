let sentryEnabled = false;
let sentryModule: typeof import('@sentry/react') | null = null;
let sentryModulePromise: Promise<typeof import('@sentry/react') | null> | null = null;

function getTraceSampleRate() {
  const value = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

async function loadSentryModule() {
  if (sentryModule) {
    return sentryModule;
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/react')
      .then((module) => {
        sentryModule = module;
        return module;
      })
      .catch((error) => {
        sentryModulePromise = null;

        if (import.meta.env.DEV) {
          console.error('[observability] failed to load Sentry', error);
        }

        return null;
      });
  }

  return sentryModulePromise;
}

export function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || sentryEnabled) {
    return;
  }

  sentryEnabled = true;

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      sentryEnabled = false;
      return;
    }

    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      tracesSampleRate: getTraceSampleRate(),
      sendDefaultPii: false,
    });
  });
}

export function captureException(error: unknown, extra?: Record<string, unknown>) {
  void loadSentryModule().then((Sentry) => {
    if (sentryEnabled && Sentry) {
      Sentry.captureException(error, { extra });
      return;
    }

    if (import.meta.env.DEV) {
      console.error('[observability]', error, extra);
    }
  });
}

export function setObservabilityUser(user: { id: number; email?: string | null; nome?: string | null } | null) {
  if (!sentryEnabled) {
    return;
  }

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.setUser(user ? {
      id: String(user.id),
      email: user.email ?? undefined,
      username: user.nome ?? undefined,
    } : null);
  });
}
