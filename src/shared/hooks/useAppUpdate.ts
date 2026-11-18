import { useEffect, useState } from 'react';

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Build metadata only: never send session credentials or tenant data.
export function useAppUpdate(enabled = import.meta.env.PROD, buildId = __APP_BUILD_ID__) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let controller: AbortController | null = null;
    let lastCheck = -Infinity;
    let detected = false;

    const check = async () => {
      if (document.visibilityState === 'hidden' || controller || detected
        || Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return;
      lastCheck = Date.now();
      controller = new AbortController();
      const request = controller;
      const timeout = window.setTimeout(() => request.abort(), 10_000);
      try {
        const response = await fetch(
          '/index.html?app-version-check=' + Date.now(),
          { cache: 'no-store', credentials: 'omit', signal: request.signal },
        );
        if (!response.ok) return;
        const html = new DOMParser().parseFromString(await response.text(), 'text/html');
        const remoteId = html.querySelector('meta[name="hemodinks-build-id"]')?.getAttribute('content');
        if (!disposed && remoteId && remoteId !== buildId) {
          detected = true;
          setAvailable(true);
        }
      } catch {
        // Offline, timeout or an unavailable server must not interrupt the app.
      } finally {
        window.clearTimeout(timeout);
        controller = null;
      }
    };

    // Chunk que sumiu após um deploy (import dinâmico de tela antiga): o build mudou com certeza,
    // então o aviso aparece na hora, sem esperar a próxima verificação. Não recarrega sozinho.
    const onStaleChunk = () => {
      if (disposed || detected) return;
      detected = true;
      setAvailable(true);
    };

    void check();
    const onResume = () => { void check(); };
    const interval = window.setInterval(onResume, UPDATE_CHECK_INTERVAL_MS);
    window.addEventListener('focus', onResume);
    window.addEventListener('vite:preloadError', onStaleChunk);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('vite:preloadError', onStaleChunk);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [enabled, buildId]);

  return available;
}
