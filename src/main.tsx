import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNewRelicBrowser } from './newRelic';
import { initOpenTelemetryBrowser } from './otel';
import { initObservability } from './observability';
import './styles.css';

async function bootstrap() {
  initNewRelicBrowser();
  initObservability();
  await initOpenTelemetryBrowser();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
