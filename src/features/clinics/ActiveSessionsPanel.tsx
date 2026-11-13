import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { AuthSession } from '../../types';
import { listPlatformActiveSessions } from '../../services';
import { AlertMessage, DataPanel, IconButton } from '../../shared/components/ui';
import { queryKeys } from '../../shared/queryKeys';
import { SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatters';

type Props = { session: AuthSession };

const REFRESH_INTERVAL_MS = 60_000;
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : timeFormatter.format(date);
};

// Só UX: a API devolve 403 para qualquer perfil que não seja SuperAdministrador.
export function ActiveSessionsPanel({ session }: Props) {
  const isSuperAdmin = session.user.perfilId === SUPER_ADMIN_PROFILE_ID;
  const sessionsQuery = useQuery({
    queryKey: queryKeys.platformActiveSessions(session.token),
    queryFn: ({ signal }) => listPlatformActiveSessions(session.token, 1, 200, signal),
    enabled: isSuperAdmin,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: 15_000,
    retry: false,
  });

  if (!isSuperAdmin) return null;

  const data = sessionsQuery.data;
  const items = Array.isArray(data?.items) ? data.items : [];
  const clinics = Array.isArray(data?.porClinica) ? data.porClinica : [];
  const loading = sessionsQuery.isPending;

  return (
    <DataPanel>
      <section className="active-sessions" aria-labelledby="active-sessions-title">
        <div className="data-header">
          <div>
            <span className="eyebrow">Somente SuperAdministrador</span>
            <h2 id="active-sessions-title">
              {typeof data?.usuariosOnline === 'number' ? `${data.usuariosOnline} ${data.usuariosOnline === 1 ? 'usuário online' : 'usuários online'}` : 'Usuários online'}
            </h2>
            {typeof data?.totalSessoes === 'number' && <small className="active-sessions-hint">Atividade nos últimos {data.janelaOciosidadeMinutos} minutos · {data.totalSessoes} {data.totalSessoes === 1 ? 'sessão' : 'sessões'}</small>}
          </div>
          <div className="table-tools">
            <IconButton label="Atualizar sessões ativas" onClick={() => void sessionsQuery.refetch()}>
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </div>
        {sessionsQuery.isError && <AlertMessage type="error">Não foi possível carregar as sessões ativas.</AlertMessage>}
        {clinics.length > 0 && (
          <ul className="active-sessions-clinics" aria-label="Usuários online por clínica">
            {clinics.map((clinic) => (
              <li key={clinic.clinicaId}><strong>{clinic.usuarios}</strong><span>{clinic.clinica}</span></li>
            ))}
          </ul>
        )}
        {typeof data?.totalSessoes === 'number' && data.totalSessoes > items.length && (
          <small className="active-sessions-hint">Exibindo as {items.length} sessões mais recentes de {data.totalSessoes}.</small>
        )}
        <div className="table-wrap">
          <table className="users-table active-sessions-table" aria-label="Sessões ativas">
            <thead><tr><th>Usuário</th><th>Perfil</th><th>Clínica</th><th>Início</th><th>Última atividade</th><th>Navegador</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="empty-row" role="status">Carregando sessões...</td></tr>
                : !data ? <tr><td colSpan={6} className="empty-row">Sessões indisponíveis.</td></tr>
                : items.length === 0 ? <tr><td colSpan={6} className="empty-row">Nenhum usuário online agora.</td></tr>
                  : items.map((item, index) => (
                    <tr key={`${item.usuarioGlobalId}-${item.clinicaId}-${item.inicio}-${index}`}>
                      <td data-label="Usuário"><strong>{item.nome}</strong>{item.viaEquipe && <small className="active-sessions-team"> · via equipe</small>}</td>
                      <td data-label="Perfil">{item.perfil}</td>
                      <td data-label="Clínica">{item.clinica}</td>
                      <td data-label="Início">{formatTime(item.inicio)}</td>
                      <td data-label="Última atividade">{formatTime(item.ultimaAtividade)}</td>
                      <td data-label="Navegador">{item.navegador}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </DataPanel>
  );
}
