let sentryEnabled = false;
let sentryModule: typeof import('@sentry/react') | null = null;
let sentryModulePromise: Promise<typeof import('@sentry/react') | null> | null = null;
let cspMonitoringEnabled = false;
const reportedCspViolations = new Set<string>();
const MAX_REPORTED_CSP_VIOLATIONS = 20;

type CspViolationDetails = Pick<
  SecurityPolicyViolationEvent,
  | 'blockedURI'
  | 'columnNumber'
  | 'disposition'
  | 'documentURI'
  | 'effectiveDirective'
  | 'lineNumber'
  | 'sourceFile'
  | 'statusCode'
  | 'violatedDirective'
>;

function getSafeCspLocation(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 'unknown';
  }

  if (['inline', 'eval', 'wasm-eval'].includes(normalized)) {
    return normalized;
  }

  if (/^(?:blob|data):/i.test(normalized)) {
    return normalized.slice(0, normalized.indexOf(':') + 1).toLowerCase();
  }

  try {
    return new URL(normalized, window.location.origin).origin;
  } catch {
    return 'redacted';
  }
}

export function getCspViolationDetails(event: CspViolationDetails) {
  return {
    blockedOrigin: getSafeCspLocation(event.blockedURI),
    columnNumber: event.columnNumber,
    disposition: event.disposition,
    documentOrigin: getSafeCspLocation(event.documentURI),
    effectiveDirective: event.effectiveDirective,
    lineNumber: event.lineNumber,
    sourceOrigin: getSafeCspLocation(event.sourceFile),
    statusCode: event.statusCode,
    violatedDirective: event.violatedDirective,
  };
}

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
  if (!sentryEnabled) {
    if (import.meta.env.DEV) {
      console.error('[observability]', error, extra);
    }
    return;
  }

  void loadSentryModule().then((Sentry) => {
    if (Sentry) {
      Sentry.captureException(error, { extra });
    }
  });
}

export function initCspViolationMonitoring() {
  if (cspMonitoringEnabled || typeof window === 'undefined') {
    return;
  }

  cspMonitoringEnabled = true;
  window.addEventListener('securitypolicyviolation', (event) => {
    const details = getCspViolationDetails(event);
    const fingerprint = [
      details.disposition,
      details.effectiveDirective,
      details.blockedOrigin,
      details.sourceOrigin,
    ].join('|');

    if (
      reportedCspViolations.has(fingerprint) ||
      reportedCspViolations.size >= MAX_REPORTED_CSP_VIOLATIONS
    ) {
      return;
    }

    reportedCspViolations.add(fingerprint);
    captureException(
      new Error(`CSP violation: ${details.effectiveDirective || 'unknown-directive'}`),
      details,
    );
  });
}

export function setObservabilityUser(
  user: { id: number; email?: string | null; nome?: string | null } | null,
) {
  if (!sentryEnabled) {
    return;
  }

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.setUser(
      user
        ? {
            id: String(user.id),
            email: user.email ?? undefined,
            username: user.nome ?? undefined,
          }
        : null,
    );
  });
}
