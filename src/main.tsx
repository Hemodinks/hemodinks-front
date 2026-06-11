import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initObservability } from './observability';
import './styles.css';

initObservability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
