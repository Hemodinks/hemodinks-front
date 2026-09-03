import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { hasStartedOptionalAnalytics, startOptionalAnalytics } from './analyticsConsent';
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

  useEffect(() => {
    if (consent?.analytics) void startOptionalAnalytics();
  }, [consent?.analytics]);

  const persist = useCallback((categories: OptionalConsentCategories) => {
    const previous = readConsent();
    const next = saveConsent(categories);

    if (!categories.preferences) clearOptionalPreferenceStorage();
    if (!categories.analytics) clearApplicationAnalyticsCookies();

    setConsent(next);
    setPreferencesOpen(false);

    // New Relic Browser does not expose a supported runtime shutdown API. A reload
    // immediately applies a revocation without moving or interrupting the session.
    if (previous?.analytics && !categories.analytics && hasStartedOptionalAnalytics()) {
      window.location.reload();
    }
  }, []);

  const contextValue = useMemo(() => ({
    consent,
    openPreferences: () => setPreferencesOpen(true),
  }), [consent]);

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}

      {!consent && (
        <aside className="cookie-banner" aria-labelledby="cookie-banner-title">
          <div>
            <h2 id="cookie-banner-title">Sua privacidade no HemoDinks</h2>
            <p>
              Recursos necessários mantêm o sistema seguro. Com sua escolha, também podemos guardar preferências e ativar análise técnica. Consulte a <Link to="/politica-de-privacidade">Política de Privacidade</Link>.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" className="ghost-button" onClick={() => persist(REJECTED)}>Rejeitar opcionais</button>
            <button type="button" className="ghost-button" onClick={() => setPreferencesOpen(true)}>Configurar</button>
            <button type="button" className="ghost-button" onClick={() => persist(ACCEPTED)}>Aceitar opcionais</button>
          </div>
        </aside>
      )}

      {preferencesOpen && (
        <CookiePreferencesModal
          initialValue={consent ? { preferences: consent.preferences, analytics: consent.analytics } : REJECTED}
          onClose={() => setPreferencesOpen(false)}
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
