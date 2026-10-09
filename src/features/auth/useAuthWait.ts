import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../services/api';

// UX only: the API still decides whether each new attempt is allowed.
// Keep identities separate, without persisting email, credentials or IP state.
export function useAuthWait(identity: string) {
  const deadlines = useRef(new Map<string, number>());
  const [, render] = useState(0);
  const until = deadlines.current.get(identity);
  const seconds = Math.max(0, Math.ceil(((until ?? 0) - Date.now()) / 1000));

  useEffect(() => {
    if (!until || until <= Date.now()) return;
    const timer = window.setInterval(() => render(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [until, seconds > 0]);

  return {
    seconds,
    message: seconds > 0
      ? `Aguarde ${seconds} s. O botão será liberado ao terminar a espera; tente novamente quando estiver pronto.`
      : until ? 'Espera encerrada. Você pode tentar novamente.' : '',
    isWaiting: () => (deadlines.current.get(identity) ?? 0) > Date.now(),
    record: (error: unknown) => {
      if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds !== undefined
        && Number.isFinite(error.retryAfterSeconds) && error.retryAfterSeconds > 0) {
        deadlines.current.set(identity, Date.now() + error.retryAfterSeconds * 1000);
        render(value => value + 1);
      }
    },
  };
}
