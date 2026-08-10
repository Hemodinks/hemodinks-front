import { useEffect, useRef } from 'react';
import { AUTH_EXPIRED_EVENT, getCurrentLicenca } from '../../services';
import { MEDICAL_PROFILE_ID } from '../../shared/utils/formatters';
import { getJwtExpirationDelayMs, isJwtExpired } from '../../shared/utils/jwt';
import type { AuthSession } from '../../types';

const SESSION_EXPIRATION_LEEWAY_MS = 30_000;

export function useSessionExpiration(session: AuthSession | null, onExpired: () => void) {
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!session) return;

    const expireSession = () => onExpiredRef.current();
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
  }, [session?.token]);
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
