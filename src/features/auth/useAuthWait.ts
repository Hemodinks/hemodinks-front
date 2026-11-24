import { useEffect, useState } from 'react';
import { ApiError } from '../../services/api';

// UX only: the API still decides whether each new attempt is allowed.
// Keep identities separate, without persisting email, credentials or IP state.
// #292: prazos e "agora" ficam em estado; a renderização não lê relógio nem ref (React Compiler).
export function useAuthWait(identity: string) {
  const [deadlines, setDeadlines] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [now, setNow] = useState(0);
  const until = deadlines.get(identity);
  const seconds = Math.max(0, Math.ceil(((until ?? 0) - now) / 1000));
  const waiting = seconds > 0;

  useEffect(() => {
    if (!waiting) return;
    // Primeiro tique imediato: ao voltar para uma identidade, "agora" pode estar defasado.
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [waiting, until]);

  return {
    seconds,
    message: waiting
      ? `Aguarde ${seconds} s. O botão será liberado ao terminar a espera; tente novamente quando estiver pronto.`
      : until ? 'Espera encerrada. Você pode tentar novamente.' : '',
    isWaiting: () => (deadlines.get(identity) ?? 0) > Date.now(),
    record: (error: unknown) => {
      if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds !== undefined
        && Number.isFinite(error.retryAfterSeconds) && error.retryAfterSeconds > 0) {
        const recordedAt = Date.now();
        const deadline = recordedAt + error.retryAfterSeconds * 1000;
        setDeadlines(current => new Map(current).set(identity, deadline));
        setNow(recordedAt);
      }
    },
  };
}
