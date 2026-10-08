import { useEffect, useMemo, useRef, useState } from 'react';
import type { AuthSession, SecurityObservationPage } from '../../types';
import { getSecurityObservations } from '../../services/monitoringService';
import { ADMIN_PROFILE_ID, SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatterConstants';

export function useSecurityObservations(session: AuthSession) {
  const { token, user: { clinicaId, perfilId } } = session;
  const allowed = perfilId === ADMIN_PROFILE_ID || perfilId === SUPER_ADMIN_PROFILE_ID;
  const global = perfilId === SUPER_ADMIN_PROFILE_ID;
  const context = useMemo(() => ({}), [token, clinicaId, perfilId]);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{
    context: object;
    page: number; loading: boolean; error: string; result: SecurityObservationPage | null;
  } | null>(null);
  const previousContext = useRef(context);

  useEffect(() => {
    if (previousContext.current !== context) {
      previousContext.current = context;
      setPage(1);
      if (page !== 1) return;
    }
    if (!allowed) { setState(null); return; }
    const controller = new AbortController();
    let active = true;
    setState({ context, page, loading: true, error: '', result: null });
    void getSecurityObservations(token, page, controller.signal).then(result => {
      if (!active) return;
      // The API is the authorization authority. Reject an inconsistent response
      // rather than displaying records outside the server-issued clinic context.
      if (!global && (!clinicaId || result.items.some(item => item.clinicId !== clinicaId))) {
        throw new Error('Não foi possível carregar os eventos de segurança neste contexto.');
      }
      setState({ context, page, loading: false, error: '', result });
    }).catch(() => {
      if (active) setState({ context, page, loading: false, error: 'Não foi possível carregar os eventos de segurança neste contexto. Tente novamente.', result: null });
    });
    return () => { active = false; controller.abort(); };
  }, [context, token, clinicaId, perfilId, allowed, global, page, refresh]);

  const current = state?.context === context && state.page === page ? state : null;
  return {
    allowed, global, page, setPage,
    loading: allowed && (!current || current.loading),
    error: current?.error ?? '', result: current?.result ?? null,
    reload: () => setRefresh(value => value + 1),
  };
}
