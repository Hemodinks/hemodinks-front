import * as Sentry from '@sentry/react';

let sentryEnabled = false;

function getTraceSampleRate() {
  const value = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
}

export function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || sentryEnabled) {
    return;
  }

  sentryEnabled = true;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: getTraceSampleRate(),
    sendDefaultPii: false,
  });
}

export function captureException(error: unknown, extra?: Record<string, unknown>) {
  if (sentryEnabled) {
    Sentry.captureException(error, { extra });
    return;
  }

  if (import.meta.env.DEV) {
    console.error('[observability]', error, extra);
  }
}

export function setObservabilityUser(user: { id: number; email?: string | null; nome?: string | null } | null) {
  if (!sentryEnabled) {
    return;
  }

  Sentry.setUser(user ? {
    id: String(user.id),
    email: user.email ?? undefined,
    username: user.nome ?? undefined,
  } : null);
}
