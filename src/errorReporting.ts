import { sanitizedErrorForTelemetry } from './telemetryPrivacy';

// Registro leve para não puxar o agente do New Relic para o bundle inicial (#262).
// Sem consentimento de análise não há reporter e nada é enviado.
export type ErrorSource = 'error-boundary' | 'react-uncaught' | 'window-error' | 'unhandled-rejection';
type Reporter = (error: Error, attributes: { source: ErrorSource }) => void;

let reporter: Reporter | null = null;
let reported = new WeakSet<object>();

export function setErrorReporter(next: Reporter | null) {
  reporter = next;
  reported = new WeakSet();
}

export function reportError(error: unknown, source: ErrorSource) {
  if (!reporter) return;
  if (typeof error === 'object' && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  try {
    reporter(sanitizedErrorForTelemetry(error), { source });
  } catch {
    // Telemetria nunca derruba a aplicação.
  }
}
