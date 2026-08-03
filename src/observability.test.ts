import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCspViolationDetails,
  initCspViolationMonitoring,
  initObservability,
} from './observability';

const sentryMocks = vi.hoisted(() => ({
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  init: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  browserTracingIntegration: sentryMocks.browserTracingIntegration,
  captureException: vi.fn(),
  init: sentryMocks.init,
  setUser: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('monitoramento de CSP', () => {
  it('remove caminhos e parâmetros dos endereços reportados', () => {
    expect(
      getCspViolationDetails({
        blockedURI: 'https://collector.example.com/v1/traces?token=secret',
        columnNumber: 8,
        disposition: 'enforce',
        documentURI: 'https://app.hemodinks.com/pacientes/123',
        effectiveDirective: 'connect-src',
        lineNumber: 12,
        sourceFile: 'https://app.hemodinks.com/assets/app.js',
        statusCode: 200,
        violatedDirective: 'connect-src',
      }),
    ).toEqual({
      blockedOrigin: 'https://collector.example.com',
      columnNumber: 8,
      disposition: 'enforce',
      documentOrigin: 'https://app.hemodinks.com',
      effectiveDirective: 'connect-src',
      lineNumber: 12,
      sourceOrigin: 'https://app.hemodinks.com',
      statusCode: 200,
      violatedDirective: 'connect-src',
    });
  });

  it('registra o listener apenas uma vez', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');

    initCspViolationMonitoring();
    initCspViolationMonitoring();

    expect(
      addEventListener.mock.calls.filter(([event]) => event === 'securitypolicyviolation'),
    ).toHaveLength(1);
  });
});

describe('observabilidade de desempenho', () => {
  it('ativa BrowserTracing para coletar Web Vitals quando há amostragem', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
    vi.stubEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', '0.25');

    initObservability();

    await waitFor(() => expect(sentryMocks.init).toHaveBeenCalledOnce());
    expect(sentryMocks.browserTracingIntegration).toHaveBeenCalledOnce();
    expect(sentryMocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [{ name: 'BrowserTracing' }],
        sendDefaultPii: false,
        tracesSampleRate: 0.25,
      }),
    );
  });
});
