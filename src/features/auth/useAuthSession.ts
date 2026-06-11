import { useCallback, useState } from 'react';
import type { AuthSession } from '../../types';

const SESSION_KEY = 'hemodinks.session';

function loadStoredSession(): AuthSession | null {
  const rawSession = localStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());

  const persistSession = useCallback((nextSession: AuthSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return {
    session,
    persistSession,
    clearSession,
  };
}
