import { useCallback, useEffect, useMemo, useState } from 'react';
import { acceptCurrentLegalDocuments, getCurrentLegalAcceptance } from '../../services';
import type { AuthSession } from '../../types';
import type { LegalAcceptanceStatus } from '../../types/legalAcceptance';
import { getErrorMessage } from '../../shared/utils/formatters';
import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from './legalVersions';

type AcceptanceState = {
  scopeKey: string;
  status: LegalAcceptanceStatus | null;
  loading: boolean;
  accepting: boolean;
  error: string;
};

const EMPTY_STATE: AcceptanceState = {
  scopeKey: '',
  status: null,
  loading: false,
  accepting: false,
  error: '',
};

export function useLegalAcceptance(session: AuthSession | null) {
  const scopeKey = session ? `${session.user.id}:${session.user.clinicaId ?? 0}:${session.token}` : '';
  const [state, setState] = useState<AcceptanceState>(EMPTY_STATE);

  const load = useCallback(async () => {
    if (!session) {
      setState(EMPTY_STATE);
      return;
    }

    setState({ scopeKey, status: null, loading: true, accepting: false, error: '' });
    try {
      const status = await getCurrentLegalAcceptance(session.token);
      setState({ scopeKey, status, loading: false, accepting: false, error: '' });
    } catch (error) {
      setState({ scopeKey, status: null, loading: false, accepting: false, error: getErrorMessage(error) });
    }
  }, [scopeKey, session]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = useCallback(async () => {
    if (!session) return false;

    setState((current) => ({ ...current, accepting: true, error: '' }));
    try {
      const status = await acceptCurrentLegalDocuments(
        session.token,
        TERMS_VERSION,
        PRIVACY_NOTICE_VERSION,
      );
      setState({ scopeKey, status, loading: false, accepting: false, error: '' });
      return true;
    } catch (error) {
      setState((current) => ({ ...current, accepting: false, error: getErrorMessage(error) }));
      return false;
    }
  }, [scopeKey, session]);

  return useMemo(() => {
    const resolvedForCurrentScope = Boolean(scopeKey && state.scopeKey === scopeKey && state.status);
    const isCurrent = resolvedForCurrentScope
      && state.status?.requiresAcceptance === false
      && state.status.termsOfUse.currentVersion === TERMS_VERSION
      && state.status.termsOfUse.isCurrent
      && state.status.privacyNotice.currentVersion === PRIVACY_NOTICE_VERSION
      && state.status.privacyNotice.isCurrent;

    return {
      status: resolvedForCurrentScope ? state.status : null,
      loading: Boolean(session) && (!resolvedForCurrentScope && !state.error || state.loading),
      accepting: state.accepting,
      error: state.scopeKey === scopeKey ? state.error : '',
      isCurrent,
      accept,
      retry: load,
    };
  }, [accept, load, scopeKey, session, state]);
}
