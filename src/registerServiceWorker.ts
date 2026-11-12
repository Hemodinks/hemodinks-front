export const SERVICE_WORKER_URL = '/sw.js';

type ServiceWorkerHost = {
  navigator: Pick<Navigator, 'serviceWorker'> | Partial<Pick<Navigator, 'serviceWorker'>>;
  document: Pick<Document, 'readyState'>;
  addEventListener: Window['addEventListener'];
};

// Installable PWA (#206). The worker only caches static build assets and icons (public/sw.js);
// it is registered in production builds only, after load, and a failure never affects the app.
export function registerServiceWorker(enabled = import.meta.env.PROD, host: ServiceWorkerHost = window) {
  const serviceWorker = host.navigator.serviceWorker;
  if (!enabled || !serviceWorker) return;
  const register = () => {
    serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' }).catch(() => undefined);
  };
  if (host.document.readyState === 'complete') register();
  else host.addEventListener('load', register, { once: true });
}
