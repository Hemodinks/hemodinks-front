import { useEffect, useRef } from 'react';
import { AUTH_EXPIRED_EVENT, getCurrentLicenca } from '../../services';
import { MEDICAL_PROFILE_ID } from '../../shared/utils/formatters';
import { getJwtExpirationMs, isJwtExpired, decodeJwtPayload } from '../../shared/utils/jwt';
import { ApiError, registerSessionTokenResolver } from '../../services/api';
import { renewSession, recordSessionActivity, sessionIdentity } from '../../services/sessionService';
import type { AuthSession } from '../../types';

export function useSessionExpiration(session: AuthSession | null, onExpired: () => void,
  persistSession: (session: AuthSession) => void) {
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const current = useRef(session);
  current.current = session;
  const persist = useRef(persistSession);
  persist.current = persistSession;
  const identity = session ? sessionIdentity(session.token) : null;

  useEffect(() => {
    if (!session) return;

    let disposed = false;
    let expired = false;
    let lastActivity = Date.now();
    let lastSentActivity = 0;
    let lastAttempt = 0;
    let idleMs = 30 * 60_000;
    let lastBroadcast = 0;
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('hemodinks-session-activity');
    if (channel) channel.onmessage = event => {
      const message = event.data as { identity?: string; at?: number } | null;
      if (!expired && message?.identity === identity && typeof message.at === 'number'
        && message.at <= Date.now() && message.at > lastActivity) lastActivity = message.at;
    };
    let inFlight: Promise<string> | null = null;
    const expireSession = () => {
      if (!disposed && !expired) { expired = true; onExpiredRef.current(); }
    };
    const handleExpired = (event: Event) => {
      const rejectedToken = (event as CustomEvent<{ token?: string }>).detail?.token;
      if (rejectedToken && current.current?.token !== rejectedToken) return;
      expireSession();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    const claims = decodeJwtPayload(session.token);
    const renewable = Boolean(claims?.sid || claims?.equipeId);
    if (!renewable && isJwtExpired(session.token)) {
      expireSession();
      channel?.close();
      return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    }
    const resolveToken = async (requested: string, force: boolean): Promise<string> => {
      const latest = current.current;
      if (disposed || expired || !latest || sessionIdentity(requested) !== identity)
        throw new ApiError('A sessão foi alterada.', 401);
      if (Date.now() - lastActivity >= idleMs) {
        expireSession();
        throw new ApiError('Sessão inativa.', 401);
      }
      const expires = getJwtExpirationMs(latest.token);
      if (latest.token !== requested && expires !== null && expires - Date.now() > 120_000) return latest.token;
      if (!renewable || (!force && (expires === null || expires - Date.now() > 120_000))) return latest.token;
      if (inFlight) return inFlight;
      const activity = lastActivity;
      lastAttempt = Date.now();
      inFlight = renewSession(latest.token, activity > lastSentActivity).then(result => {
        if (disposed || expired || current.current?.token !== latest.token)
          throw new ApiError('A sessão foi alterada.', 409);
        lastSentActivity = activity;
        idleMs = result.idleTimeoutMinutes * 60_000;
        const payload = decodeJwtPayload(result.token);
        const updated: AuthSession = { ...latest, token: result.token, user: {
          ...latest.user,
          perfilId: Number(payload?.perfilId ?? latest.user.perfilId),
          perfilNome: String(payload?.perfilNome ?? latest.user.perfilNome),
          precisaTrocarSenha: payload?.precisaTrocarSenha === 'true',
          precisaTrocarPin: payload?.precisaTrocarPin === 'true',
        } };
        current.current = updated;
        persist.current(updated);
        return result.token;
      }).catch(error => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) expireSession();
        throw error;
      }).finally(() => { inFlight = null; });
      return inFlight;
    };
    const tick = () => {
      if (Date.now() - lastActivity >= idleMs) { expireSession(); return; }
      const token = current.current?.token;
      if (!token || disposed || expired) return;
      if (!renewable) { if (isJwtExpired(token)) expireSession(); return; }
      if (Date.now() - lastAttempt < 60_000) return;
      const nearingExpiry = (getJwtExpirationMs(token) ?? Infinity) - Date.now() <= 120_000;
      if (nearingExpiry) { void resolveToken(token, true).catch(() => {}); return; }
      if (lastActivity > lastSentActivity) {
        const sentActivity = lastActivity;
        lastAttempt = Date.now();
        void recordSessionActivity(token).then(result => {
          if (disposed || expired) return;
          lastSentActivity = Math.max(lastSentActivity, sentActivity);
          idleMs = result.idleTimeoutMinutes * 60_000;
        }).catch(error => {
          if (!disposed && !expired && error instanceof ApiError && (error.status === 401 || error.status === 403))
            void resolveToken(token, true).catch(() => {});
        });
      }
    };
    const activity = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastActivity >= idleMs) { expireSession(); return; }
      lastActivity = Date.now();
      if (lastActivity - lastBroadcast >= 1000) {
        channel?.postMessage({ identity, at: lastActivity });
        lastBroadcast = lastActivity;
      }
      tick();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'input', 'scroll', 'wheel', 'touchstart'];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    const unregister = registerSessionTokenResolver(resolveToken);
    const timer = window.setInterval(tick, 15_000);
    tick();
    return () => {
      disposed = true;
      channel?.close();
      unregister();
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      events.forEach(event => window.removeEventListener(event, activity));
      window.clearInterval(timer);
    };
  }, [identity]);
}

export function useMedicalLicenseHydration(
  session: AuthSession | null,
  persistSession: (session: AuthSession) => void,
) {
  useEffect(() => {
    if (!session || session.user.perfilId !== MEDICAL_PROFILE_ID || session.user.licenca) return;

    let cancelled = false;
    void getCurrentLicenca(session.token)
      .then((licenca) => {
        if (!licenca || cancelled) return;
        persistSession({ ...session, user: { ...session.user, licenca } });
      })
      .catch(() => {
        // Preserve the legacy medical fallback when login does not return a license.
      });

    return () => {
      cancelled = true;
    };
  }, [persistSession, session]);
}
