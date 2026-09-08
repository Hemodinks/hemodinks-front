import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuthSession } from '../../types';
import { getCurrentPrivacyPreference, updateCurrentPrivacyPreference } from '../../services';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { startOptionalAnalytics, stopOptionalAnalytics } from './analyticsConsent';
import {
  clearApplicationAnalyticsCookies,
  clearOptionalPreferenceStorage,
  PRIVACY_POLICY_VERSION,
  type ConsentRecord,
  type OptionalConsentCategories,
  readConsent,
  saveConsent,
} from '../../shared/privacy/consentStorage';
import './privacy.css';

type ConsentContextValue = {
  consent: ConsentRecord | null;
  openPreferences: () => void;
  bindAuthenticatedSession: (session: AuthSession | null) => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);
const REJECTED: OptionalConsentCategories = { preferences: false, analytics: false };
const ACCEPTED: OptionalConsentCategories = { preferences: true, analytics: true };

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [authenticatedSession, setAuthenticatedSession] = useState<AuthSession | null>(null);
  const preferencesTriggerRef = useRef<HTMLElement | null>(null);
  const consentRef = useRef(consent);
  const localRevisionRef = useRef(0);

  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);

  useEffect(() => {
    document.documentElement.classList.toggle('privacy-consent-pending', !consent);
    return () => document.documentElement.classList.remove('privacy-consent-pending');
  }, [consent]);

  useEffect(() => {
    if (consent?.analytics) void startOptionalAnalytics();
  }, [consent?.analytics]);

  const openPreferences = useCallback(() => {
    preferencesTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setPreferencesOpen(false);
    window.requestAnimationFrame(() => {
      if (preferencesTriggerRef.current?.isConnected) preferencesTriggerRef.current.focus();
    });
  }, []);

  const applyPreference = useCallback((
    categories: OptionalConsentCategories,
    options: { synchronizeBackend: boolean; updatedAt?: string } = { synchronizeBackend: true },
  ) => {
    const previous = readConsent();
    const next = saveConsent(categories, options.updatedAt);
    localRevisionRef.current += 1;
    consentRef.current = next;

    if (!categories.preferences) clearOptionalPreferenceStorage();
    if (!categories.analytics) clearApplicationAnalyticsCookies();

    setConsent(next);
    setPreferencesOpen(false);

    if (options.synchronizeBackend && authenticatedSession) {
      void updateCurrentPrivacyPreference(
        authenticatedSession.token,
        next.version,
        next.preferences,
        next.analytics,
      ).catch((error) => {
        if (import.meta.env.DEV) console.warn('[privacy] failed to synchronize preference', error);
      });
    }

    if (previous?.analytics && !categories.analytics) {
      void stopOptionalAnalytics().then(({ requiresReload }) => {
        // New Relic Browser has no supported shutdown API and the browser OTel
        // provider cannot be registered again safely after shutdown. Reloading
        // preserves the session while applying revocation before app bootstrap.
        if (requiresReload) window.location.reload();
      });
    }
  }, [authenticatedSession]);

  const persist = useCallback((categories: OptionalConsentCategories) => {
    applyPreference(categories);
  }, [applyPreference]);

  const sessionScope = authenticatedSession
    ? `${authenticatedSession.user.id}:${authenticatedSession.user.clinicaId ?? 0}:${authenticatedSession.token}`
    : '';

  useEffect(() => {
    if (!authenticatedSession) return;

    let active = true;
    const revisionAtStart = localRevisionRef.current;

    void getCurrentPrivacyPreference(authenticatedSession.token)
      .then(async (remote) => {
        if (!active || localRevisionRef.current !== revisionAtStart) return;

        const remoteIsCurrent = remote.hasPreference
          && remote.documentVersion === PRIVACY_POLICY_VERSION
          && remote.currentDocumentVersion === PRIVACY_POLICY_VERSION;

        if (remoteIsCurrent) {
          applyPreference(
            {
              preferences: remote.preferencesEnabled,
              analytics: remote.analyticsEnabled,
            },
            {
              synchronizeBackend: false,
              updatedAt: remote.updatedAtUtc ?? undefined,
            },
          );
          return;
        }

        const local = consentRef.current;
        if (!local) return;

        await updateCurrentPrivacyPreference(
          authenticatedSession.token,
          local.version,
          local.preferences,
          local.analytics,
        );
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.warn('[privacy] failed to load preference', error);
      });

    return () => {
      active = false;
    };
  }, [applyPreference, authenticatedSession, sessionScope]);

  const contextValue = useMemo(() => ({
    consent,
    openPreferences,
    bindAuthenticatedSession: setAuthenticatedSession,
  }), [consent, openPreferences]);

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}

      {!consent && (
        <aside
          className={`cookie-banner ${preferencesOpen ? 'cookie-banner-behind-modal' : ''}`.trim()}
          aria-labelledby="cookie-banner-title"
          aria-hidden={preferencesOpen || undefined}
          inert={preferencesOpen || undefined}
        >
          <div>
            <h2 id="cookie-banner-title">Sua privacidade no HemoDinks</h2>
            <p>
              Recursos necessários mantêm o sistema seguro. Com sua escolha, também podemos guardar preferências e ativar análise técnica. Consulte a <Link to="/politica-de-privacidade">Política de Privacidade</Link>.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" className="ghost-button" onClick={() => persist(REJECTED)}>Rejeitar opcionais</button>
            <button type="button" className="ghost-button" onClick={openPreferences}>Configurar</button>
            <button type="button" className="ghost-button" onClick={() => persist(ACCEPTED)}>Aceitar opcionais</button>
          </div>
        </aside>
      )}

      {preferencesOpen && (
        <CookiePreferencesModal
          initialValue={consent ? { preferences: consent.preferences, analytics: consent.analytics } : REJECTED}
          onClose={closePreferences}
          onSave={persist}
        />
      )}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useConsent must be used within ConsentProvider');
  return context;
}

export function usePrivacyPreferenceSession(session: AuthSession | null) {
  const { bindAuthenticatedSession } = useConsent();

  useEffect(() => {
    bindAuthenticatedSession(session);
    return () => bindAuthenticatedSession(null);
  }, [bindAuthenticatedSession, session]);
}
