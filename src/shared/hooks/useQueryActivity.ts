import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  getQueryActivitySnapshot,
  subscribeToQueryActivity,
} from '../../services/queryActivity';

const SHOW_DELAY_MS = 180;
const MINIMUM_VISIBLE_MS = 350;

export function useQueryActivity() {
  const queryActive = useSyncExternalStore(
    subscribeToQueryActivity,
    getQueryActivitySnapshot,
    getQueryActivitySnapshot,
  );
  const [visible, setVisible] = useState(false);
  const visibleSinceRef = useRef(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (queryActive) {
      if (!visible) {
        timeoutId = setTimeout(() => {
          visibleSinceRef.current = Date.now();
          setVisible(true);
        }, SHOW_DELAY_MS);
      }
    } else if (visible) {
      const elapsed = Date.now() - visibleSinceRef.current;
      timeoutId = setTimeout(
        () => setVisible(false),
        Math.max(0, MINIMUM_VISIBLE_MS - elapsed),
      );
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [queryActive, visible]);

  return visible;
}
