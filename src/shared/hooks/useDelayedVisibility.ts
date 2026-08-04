import { useEffect, useRef, useState } from 'react';

const SHOW_DELAY_MS = 180;
const MINIMUM_VISIBLE_MS = 350;

export function useDelayedVisibility(active: boolean) {
  const [visible, setVisible] = useState(false);
  const visibleSinceRef = useRef(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (active && !visible) {
      timeoutId = setTimeout(() => {
        visibleSinceRef.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);
    } else if (!active && visible) {
      const elapsed = Date.now() - visibleSinceRef.current;
      timeoutId = setTimeout(() => setVisible(false), Math.max(0, MINIMUM_VISIBLE_MS - elapsed));
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [active, visible]);

  return visible;
}
