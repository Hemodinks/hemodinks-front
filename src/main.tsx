import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './registerServiceWorker';
import { warmupApi } from './services/warmupService';
import { reportError } from './errorReporting';
import { privateErrorSummary } from './telemetryPrivacy';
import '@fontsource-variable/comfortaa';
import './styles.css';

function bootstrap() {
  // Erros já tratados pelo ErrorBoundary são reportados em componentDidCatch (#262).
  // Os três handlers substituem o padrão do React, que manda a mensagem crua ao console.
  createRoot(document.getElementById('root')!, {
    onUncaughtError: (error) => {
      if (import.meta.env.DEV) console.error('[react]', privateErrorSummary(error));
      reportError(error, 'react-uncaught');
    },
    onCaughtError: () => {},
    onRecoverableError: (error) => {
      if (import.meta.env.DEV) console.warn('[react]', privateErrorSummary(error));
    },
  }).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  void warmupApi();
  registerServiceWorker();
}

bootstrap();
