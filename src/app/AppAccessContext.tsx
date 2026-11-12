import { createContext, useContext, type ReactNode } from 'react';
import type { AppAccess } from './appAccess';

// UX-only permissions derived from the session by getAppAccess; the API enforces authorization.
const AppAccessContext = createContext<AppAccess | null>(null);

export function AppAccessProvider({ access, children }: { access: AppAccess; children: ReactNode }) {
  return <AppAccessContext.Provider value={access}>{children}</AppAccessContext.Provider>;
}

// No permissive fallback: rendering a permission-aware screen outside the provider is a bug.
export function useAppAccess(): AppAccess {
  const access = useContext(AppAccessContext);
  if (!access) throw new Error('useAppAccess must be used inside AppAccessProvider.');
  return access;
}
