import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initObservability } from './observability';
import './styles.css';

function initializeTelemetry() {
  initObservability();
  void Promise.allSettled([
    import('./newRelic').then(({ initNewRelicBrowser }) => initNewRelicBrowser()),
    import('./otel').then(({ initOpenTelemetryBrowser }) => initOpenTelemetryBrowser()),
  ]);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

queueMicrotask(initializeTelemetry);
