import { type ReactNode, useLayoutEffect, useRef } from 'react';

export function useFocusOnFeedback<TElement extends HTMLElement>(
  enabled: boolean,
  content: ReactNode,
) {
  const feedbackRef = useRef<TElement>(null);

  useLayoutEffect(() => {
    if (!enabled || !feedbackRef.current) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    feedbackRef.current.focus();
  }, [content, enabled]);

  return feedbackRef;
}
