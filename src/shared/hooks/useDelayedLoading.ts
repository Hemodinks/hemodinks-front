import { useEffect, useState } from 'react';

export function useDelayedLoading(active: boolean, delayMs = 1000) {
  const [visible, setVisible] = useState(false);
  // #292: desligar zera na própria renderização (ajuste de estado pela prop), não num efeito.
  if (!active && visible) setVisible(false);

  useEffect(() => {
    if (!active) return;

    const timeoutId = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);

  return visible;
}
