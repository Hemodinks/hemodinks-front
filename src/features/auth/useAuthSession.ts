import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSession } from '../../types';
import { TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import { decodeJwtPayload } from '../../shared/utils/jwt';
import { revokeSession, restoreSession } from '../../services/sessionService';
import { sessionEpoch, advanceSessionEpoch } from '../../services/sessionEpoch';
import { buildSessionFromLogin } from '../../app/appSession';
import { queryClient } from '../../queryClient';

const SESSION_KEY = 'hemodinks.session';

function clearStoredSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Storage can be disabled. */ }
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Credentials remain in memory only. */ }
}

export function normalizeTeamPinRequirement(session: AuthSession) {
  const claims = decodeJwtPayload(session.token);
  if (claims?.temporary_password === 'true' && !session.user.precisaTrocarSenha) {
    session = { ...session, user: { ...session.user, precisaTrocarSenha: true } };
  }
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

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() => { clearStoredSession(); return null; });
  const [restoring, setRestoring] = useState(true);
  const current = useRef<AuthSession | null>(null);
  const version = useRef(0);
  const bootstrap = useRef<ReturnType<typeof restoreSession> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const contextOf = (value: AuthSession) => { const claims = decodeJwtPayload(value.token); return JSON.stringify([claims?.sid, value.user.clinicaId]); };

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const connection = new BroadcastChannel('hemodinks-session-lifecycle');
    channel.current = connection;
    connection.onmessage = event => {
      if (event.data?.type !== 'invalidate' || typeof event.data.context !== 'string') return;
      // Before bootstrap completes we cannot identify its session yet. Invalidate the
      // pending response; an old logout must never clear a different active session.
      if (current.current && event.data.context !== contextOf(current.current)) return;
      version.current++; advanceSessionEpoch(); current.current = null;
      clearStoredSession(); queryClient.clear(); setSession(null); setRestoring(false);
    };
    return () => { channel.current = null; connection.close(); };
  }, []);

  const persistSession = useCallback((nextSession: AuthSession) => {
    version.current++;
    const normalized = normalizeTeamPinRequirement(nextSession);
    const old = current.current;
    if (!old || old.user.id !== normalized.user.id || old.user.clinicaId !== normalized.user.clinicaId
      || decodeJwtPayload(old.token)?.sid !== decodeJwtPayload(normalized.token)?.sid) {
      if (old) channel.current?.postMessage({ type: 'invalidate', context: contextOf(old) });
      advanceSessionEpoch();
      queryClient.clear();
    }
    clearStoredSession();
    current.current = normalized;
    setSession(normalized);
    setRestoring(false);
  }, []);

  useEffect(() => {
    let active = true;
    const requestedVersion = version.current;
    const epoch = sessionEpoch();
    bootstrap.current ??= restoreSession();
    void bootstrap.current.then(result => {
      if (active && requestedVersion === version.current && epoch === sessionEpoch() && result)
        persistSession(buildSessionFromLogin(result));
    }).catch(() => { /* A network failure never falls back to untrusted storage or retries endlessly. */ })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [persistSession]);

  const clearSession = useCallback(() => {
    version.current++;
    advanceSessionEpoch();
    const previous = current.current;
    if (previous) channel.current?.postMessage({ type: 'invalidate', context: contextOf(previous) });
    current.current = null;
    clearStoredSession();
    queryClient.clear();
    setSession(null);
    setRestoring(false);
    if (previous) void revokeSession(previous.token).catch(() => {});
  }, []);

  return { session, persistSession, clearSession, restoring };
}
