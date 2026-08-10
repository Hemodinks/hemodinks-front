import { useCallback, useState } from 'react';
import type { AuthSession } from '../../types';
import { TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import { decodeJwtPayload } from '../../shared/utils/jwt';

const SESSION_KEY = 'hemodinks.session';

function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function normalizeTeamPinRequirement(session: AuthSession) {
  if (session.user.perfilId !== TEAM_PROFILE_ID || !session.user.precisaTrocarPin) {
    return session;
  }

  const tokenPayload = decodeJwtPayload(session.token);
  const reliableIdentification = tokenPayload?.identificacaoConfiavel;
  if (reliableIdentification !== false && reliableIdentification !== 'false') {
    return session;
  }

  return {
    ...session,
    user: { ...session.user, precisaTrocarPin: false },
  };
}

function readStoredSession() {
  localStorage.removeItem(SESSION_KEY);

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<AuthSession>;
    if (typeof parsed.token !== 'string' || !parsed.token || !parsed.user || typeof parsed.user.id !== 'number') {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    const session = normalizeTeamPinRequirement(parsed as AuthSession);
    if (session !== parsed) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);

  const persistSession = useCallback((nextSession: AuthSession) => {
    const normalizedSession = normalizeTeamPinRequirement(nextSession);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));
    setSession(normalizedSession);
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
