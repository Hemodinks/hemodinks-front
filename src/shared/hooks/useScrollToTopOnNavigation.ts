import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollToTopOnNavigation() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);
}
