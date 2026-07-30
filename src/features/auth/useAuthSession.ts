import { useCallback, useState } from 'react';
import type { AuthSession } from './authTypes';

const SESSION_KEY = 'hemodinks.session';

declare global {
  interface Window {
    __HEMODINKS_AUDIT_SESSION__?: AuthSession;
  }
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    clearStoredSession();
    return window.location.hostname === '127.0.0.1'
      ? (window.__HEMODINKS_AUDIT_SESSION__ ?? null)
      : null;
  });

  const persistSession = useCallback((nextSession: AuthSession) => {
    clearStoredSession();
    setSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  return {
    session,
    persistSession,
    clearSession,
  };
}
