import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNewRelicBrowser } from './newRelic';
import { initObservability } from './observability';
import './styles.css';

initNewRelicBrowser();
initObservability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
