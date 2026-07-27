import { useCallback, useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT, getCurrentLicenca } from '../services';
import { queryClient } from '../queryClient';
import { MEDICAL_PROFILE_ID } from '../shared/utils/formatters';
import { getJwtExpirationDelayMs, isJwtExpired } from '../shared/utils/jwt';
import type { AuthSession } from '../types';

const SESSION_EXPIRED_MESSAGE = 'Sua sessao expirou. Entre novamente para continuar.';
const SESSION_EXPIRATION_LEEWAY_MS = 30_000;

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
    if (!session) return;
    const expireSession = () => endSession(SESSION_EXPIRED_MESSAGE);
    window.addEventListener(AUTH_EXPIRED_EVENT, expireSession);

    if (isJwtExpired(session.token, Date.now(), SESSION_EXPIRATION_LEEWAY_MS)) {
      expireSession();
      return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expireSession);
    }

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
