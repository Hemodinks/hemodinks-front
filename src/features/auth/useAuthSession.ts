import { useCallback, useState } from 'react';
import type { AuthSession } from '../../types';

const SESSION_KEY = 'hemodinks.session';

function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    clearStoredSession();
    return null;
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
