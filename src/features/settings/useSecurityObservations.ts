import { useEffect, useMemo, useState } from 'react';
import type { AuthSession, SecurityObservationPage } from '../../types';
import { getSecurityObservations } from '../../services/monitoringService';
import { ADMIN_PROFILE_ID, SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatterConstants';

export function useSecurityObservations(session: AuthSession) {
  const { token, user: { clinicaId, perfilId } } = session;
  const allowed = perfilId === ADMIN_PROFILE_ID || perfilId === SUPER_ADMIN_PROFILE_ID;
  const global = perfilId === SUPER_ADMIN_PROFILE_ID;
  // Identidade nova a cada troca de token, clínica ou perfil (descarta resultados do contexto anterior).
  const context = useMemo(() => ({ scope: `${token}:${clinicaId}:${perfilId}` }), [token, clinicaId, perfilId]);
  const [page, setPage] = useState(1);
  // #292: contexto novo volta para a página 1 na própria renderização (antes: num efeito com ref).
  const [pageContext, setPageContext] = useState(context);
  if (pageContext !== context) {
    setPageContext(context);
    setPage(1);
  }
  const [refresh, setRefresh] = useState(0);
  // Resultado guardado com contexto, página e recarga pedidos; "carregando" = nada guardado para eles.
  const [state, setState] = useState<{
    context: object; page: number; refresh: number; error: string; result: SecurityObservationPage | null;
  } | null>(null);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let active = true;
    void getSecurityObservations(token, page, controller.signal).then(result => {
      if (!active) return;
      // The API is the authorization authority. Reject an inconsistent response
      // rather than displaying records outside the server-issued clinic context.
      if (!global && (!clinicaId || result.items.some(item => item.clinicId !== clinicaId))) {
        throw new Error('Não foi possível carregar os eventos de segurança neste contexto.');
      }
      setState({ context, page, refresh, error: '', result });
    }).catch(() => {
      if (active) setState({ context, page, refresh, error: 'Não foi possível carregar os eventos de segurança neste contexto. Tente novamente.', result: null });
    });
    return () => { active = false; controller.abort(); };
  }, [context, token, clinicaId, allowed, global, page, refresh]);

  const current = allowed && state?.context === context && state.page === page && state.refresh === refresh ? state : null;
  return {
    allowed, global, page, setPage,
    loading: allowed && !current,
    error: current?.error ?? '', result: current?.result ?? null,
    reload: () => setRefresh(value => value + 1),
  };
}
