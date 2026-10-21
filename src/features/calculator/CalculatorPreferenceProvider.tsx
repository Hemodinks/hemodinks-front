import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession } from '../../types';
import { useConsent } from '../privacy/ConsentProvider';

const STORAGE_KEY = 'hemodinks.calculator.visibility';
const STORAGE_VERSION = 1;
type VisibilityMap = Record<string, boolean>;
type Preference = { visible: boolean; setVisible: (visible: boolean) => void };
const CalculatorPreferenceContext = createContext<Preference | null>(null);

function readVisibility(): VisibilityMap {
  try {
    const record: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!record || typeof record !== 'object' || !('version' in record) || record.version !== STORAGE_VERSION
      || !('scopes' in record) || !record.scopes || typeof record.scopes !== 'object' || Array.isArray(record.scopes)) return {};
    return Object.fromEntries(Object.entries(record.scopes)
      .filter(([key, value]) => /^(?:none|\d+):\d+$/.test(key) && typeof value === 'boolean'));
  } catch {
    return {};
  }
}

export function CalculatorPreferenceProvider({ session, children }: { session: AuthSession; children: ReactNode }) {
  const scope = `${session.user.clinicaId ?? 'none'}:${session.user.id}`;
  return <ScopedCalculatorPreference key={scope} scope={scope}>{children}</ScopedCalculatorPreference>;
}

function ScopedCalculatorPreference({ scope, children }: { scope: string; children: ReactNode }) {
  const { consent } = useConsent();
  const canPersist = consent?.preferences === true;
  const [visible, setVisible] = useState(() => canPersist ? readVisibility()[scope] ?? true : true);

  useEffect(() => {
    try {
      if (!canPersist) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: STORAGE_VERSION,
        scopes: { ...readVisibility(), [scope]: visible },
      }));
    } catch {
      // Storage may be disabled or full; the preference still works in memory.
    }
  }, [canPersist, scope, visible]);

  const value = useMemo(() => ({ visible, setVisible }), [visible]);
  return <CalculatorPreferenceContext.Provider value={value}>{children}</CalculatorPreferenceContext.Provider>;
}

export function useCalculatorPreference() {
  const preference = useContext(CalculatorPreferenceContext);
  if (!preference) throw new Error('useCalculatorPreference must be used within CalculatorPreferenceProvider');
  return preference;
}
