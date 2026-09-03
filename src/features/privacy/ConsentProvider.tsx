import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { startOptionalAnalytics, stopOptionalAnalytics } from './analyticsConsent';
import {
  clearApplicationAnalyticsCookies,
  clearOptionalPreferenceStorage,
  type ConsentRecord,
  type OptionalConsentCategories,
  readConsent,
  saveConsent,
} from '../../shared/privacy/consentStorage';
import './privacy.css';

type ConsentContextValue = {
  consent: ConsentRecord | null;
  openPreferences: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);
const REJECTED: OptionalConsentCategories = { preferences: false, analytics: false };
const ACCEPTED: OptionalConsentCategories = { preferences: true, analytics: true };

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const preferencesTriggerRef = useRef<HTMLElement | null>(null);

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

  const persist = useCallback((categories: OptionalConsentCategories) => {
    const previous = readConsent();
    const next = saveConsent(categories);

    if (!categories.preferences) clearOptionalPreferenceStorage();
    if (!categories.analytics) clearApplicationAnalyticsCookies();

    setConsent(next);
    setPreferencesOpen(false);

    if (previous?.analytics && !categories.analytics) {
      void stopOptionalAnalytics().then(({ requiresReload }) => {
        // New Relic Browser has no supported shutdown API and the browser OTel
        // provider cannot be registered again safely after shutdown. Reloading
        // preserves the session while applying revocation before app bootstrap.
        if (requiresReload) window.location.reload();
      });
    }
  }, []);

  const contextValue = useMemo(() => ({
    consent,
    openPreferences,
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
