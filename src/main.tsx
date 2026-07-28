import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initObservability } from './observability';
import { initializeOptionalTelemetry } from './telemetryBootstrap';
import './styles.css';

function initializeTelemetry() {
  initObservability();
  void initializeOptionalTelemetry();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

queueMicrotask(initializeTelemetry);
