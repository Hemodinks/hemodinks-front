import { describe, expect, it, vi } from 'vitest';
import { getCspViolationDetails, initCspViolationMonitoring } from './observability';

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
