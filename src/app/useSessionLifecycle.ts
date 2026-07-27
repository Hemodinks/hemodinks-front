import { useCallback, useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT, getCurrentLicenca, refreshSession } from '../services';
import { queryClient } from '../queryClient';
import { MEDICAL_PROFILE_ID } from '../shared/utils/formatters';
import { getJwtExpirationDelayMs, isJwtExpired } from '../shared/utils/jwt';
import type { AuthSession } from '../types';
import {
  isSessionIdle,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_REFRESH_INTERVAL_MS,
  shouldRefreshSession,
} from './sessionInactivity';

const SESSION_EXPIRED_MESSAGE = 'Sua sessao expirou. Entre novamente para continuar.';
const SESSION_EXPIRATION_LEEWAY_MS = 0;
const SESSION_REFRESH_RETRY_MS = 60_000;
const ACTIVITY_THROTTLE_MS = 1_000;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'keydown',
  'mousedown',
  'mousemove',
  'scroll',
  'touchstart',
];

type SessionLifecycleOptions = {
  session: AuthSession | null;
  persistSession: (session: AuthSession) => void;
  clearSession: () => void;
  navigate: NavigateFunction;
  navigateToDashboard: () => void;
  resetDomains: () => void;
  resetAppChrome: () => void;
  resetModuleMode: () => void;
  resetLoginFlow: (infoMessage: string) => void;
};

export function useSessionLifecycle({
  session,
  persistSession,
  clearSession,
  navigate,
  navigateToDashboard,
  resetDomains,
  resetAppChrome,
  resetModuleMode,
  resetLoginFlow,
}: SessionLifecycleOptions) {
  const actionsRef = useRef({
    clearSession,
    navigate,
    navigateToDashboard,
    resetDomains,
    resetAppChrome,
    resetModuleMode,
    resetLoginFlow,
  });
  actionsRef.current = {
    clearSession,
    navigate,
    navigateToDashboard,
    resetDomains,
    resetAppChrome,
    resetModuleMode,
    resetLoginFlow,
  };
  const sessionRef = useRef(session);
  const persistSessionRef = useRef(persistSession);
  const sessionIdentityRef = useRef<string | null>(null);
  const lastActivityAtRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const nextRefreshAttemptAtRef = useRef(0);
  const lastHandledActivityAtRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  sessionRef.current = session;
  persistSessionRef.current = persistSession;

  const endSession = useCallback((infoMessage = '') => {
    const actions = actionsRef.current;
    queryClient.clear();
    actions.clearSession();
    actions.resetAppChrome();
    actions.resetDomains();
    if (infoMessage) {
      actions.navigate('/', { replace: true });
    } else {
      actions.navigateToDashboard();
    }
    actions.resetModuleMode();
    actions.resetLoginFlow(infoMessage);
  }, []);

  const logout = useCallback(() => endSession(), [endSession]);

  useEffect(() => {
    if (!session) {
      sessionIdentityRef.current = null;
      lastActivityAtRef.current = 0;
      lastRefreshAtRef.current = 0;
      nextRefreshAttemptAtRef.current = 0;
      refreshInFlightRef.current = false;
      return;
    }

    const sessionIdentity = `${session.user.id}:${session.user.clinicaId ?? ''}`;
    if (sessionIdentityRef.current !== sessionIdentity) {
      const now = Date.now();
      sessionIdentityRef.current = sessionIdentity;
      lastActivityAtRef.current = now;
      lastRefreshAtRef.current = now;
      nextRefreshAttemptAtRef.current = now;
    }

    const expireSession = () => endSession(SESSION_EXPIRED_MESSAGE);
    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession);

    if (isJwtExpired(session.token, Date.now(), SESSION_EXPIRATION_LEEWAY_MS)) {
      expireSession();
      return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
    }

    let idleTimeoutId: number | null = null;
    let refreshTimeoutId: number | null = null;

    const scheduleIdleExpiration = () => {
      if (idleTimeoutId !== null) window.clearTimeout(idleTimeoutId);
      const elapsedMs = Date.now() - lastActivityAtRef.current;
      idleTimeoutId = window.setTimeout(
        expireSession,
        Math.max(0, SESSION_IDLE_TIMEOUT_MS - elapsedMs),
      );
    };

    const scheduleRefresh = (refresh: () => Promise<void>) => {
      if (refreshTimeoutId !== null) window.clearTimeout(refreshTimeoutId);
      if (lastActivityAtRef.current <= lastRefreshAtRef.current) return;
      const refreshAt = Math.max(
        lastRefreshAtRef.current + SESSION_REFRESH_INTERVAL_MS,
        nextRefreshAttemptAtRef.current,
      );
      refreshTimeoutId = window.setTimeout(
        () => void refresh(),
        Math.max(0, refreshAt - Date.now()),
      );
    };

    const refresh = async () => {
      const now = Date.now();
      if (refreshInFlightRef.current) return;
      if (now < nextRefreshAttemptAtRef.current
        || !shouldRefreshSession(
          lastActivityAtRef.current,
          lastRefreshAtRef.current,
          now,
        )) {
        scheduleRefresh(refresh);
        return;
      }

      const currentSession = sessionRef.current;
      if (!currentSession) return;
      const requestedToken = currentSession.token;
      refreshInFlightRef.current = true;

      try {
        const response = await refreshSession(requestedToken);
        const latestSession = sessionRef.current;
        if (!latestSession || latestSession.token !== requestedToken) return;
        const refreshedAt = Date.now();
        lastRefreshAtRef.current = refreshedAt;
        nextRefreshAttemptAtRef.current = refreshedAt;
        persistSessionRef.current({ ...latestSession, token: response.token });
      } catch {
        nextRefreshAttemptAtRef.current = Date.now() + SESSION_REFRESH_RETRY_MS;
      } finally {
        refreshInFlightRef.current = false;
        scheduleRefresh(refresh);
      }
    };

    const recordActivity = () => {
      const now = Date.now();
      if (isSessionIdle(lastActivityAtRef.current, now)) {
        expireSession();
        return;
      }
      if (now - lastHandledActivityAtRef.current < ACTIVITY_THROTTLE_MS) return;
      lastHandledActivityAtRef.current = now;
      lastActivityAtRef.current = now;
      scheduleIdleExpiration();
      scheduleRefresh(refresh);
    };

    const recordVisibilityActivity = () => {
      if (document.visibilityState === 'visible') recordActivity();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', recordVisibilityActivity);
    window.addEventListener('focus', recordActivity);
    scheduleIdleExpiration();

    const expirationDelayMs = getJwtExpirationDelayMs(
      session.token,
      Date.now(),
      SESSION_EXPIRATION_LEEWAY_MS,
    );
    const timeoutId = expirationDelayMs === null
      ? null
      : window.setTimeout(expireSession, expirationDelayMs);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      document.removeEventListener('visibilitychange', recordVisibilityActivity);
      window.removeEventListener('focus', recordActivity);
      if (idleTimeoutId !== null) window.clearTimeout(idleTimeoutId);
      if (refreshTimeoutId !== null) window.clearTimeout(refreshTimeoutId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [endSession, session?.token]);

  useEffect(() => {
    if (!session || session.user.perfilId !== MEDICAL_PROFILE_ID || session.user.licenca) return;
    let cancelled = false;
    void (async () => {
      try {
        const licenca = await getCurrentLicenca(session.token);
        if (!licenca || cancelled) return;
        persistSession({
          ...session,
          user: { ...session.user, licenca },
        });
      } catch {
        // Mantém o fallback legado quando a API ainda não retorna a licença no login.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistSession, session]);

  return { endSession, logout };
}
