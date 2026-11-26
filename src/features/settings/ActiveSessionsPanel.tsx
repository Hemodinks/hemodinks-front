import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { AuthSession } from '../../types';
import { listPlatformActiveSessions } from '../../services';
import { AlertMessage, DataPanel, IconButton } from '../../shared/components/ui';
import { SortableTableHeader } from '../../shared/components/SortableTableHeader';
import { queryKeys } from '../../shared/queryKeys';
import { SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatters';
import {
  defaultDirectionFor, formatElapsed, formatSessionTime, parseApiInstant, sortSessionRows,
  type SessionRow, type SessionSortField, type SessionStatus, type SortDirection,
} from './activeSessionsModel';

type Props = { session: AuthSession };

const REFRESH_INTERVAL_MS = 60_000;
const DEFAULT_RECENT_WINDOW_HOURS = 8;
const COLUMNS: Array<{ field: SessionSortField; label: string }> = [
  { field: 'status', label: 'Status' },
  { field: 'nome', label: 'Usuário' },
  { field: 'perfil', label: 'Perfil' },
  { field: 'clinica', label: 'Clínica' },
  { field: 'inicio', label: 'Início' },
  { field: 'ultimaAtividade', label: 'Última atividade' },
  { field: 'navegador', label: 'Navegador' },
];

function StatusBadge({ status, recentHours }: { status: SessionStatus; recentHours: number }) {
  const label = status === 'online' ? 'Online' : 'Recente';
  const title = status === 'online' ? 'Online agora' : `Esteve online nas últimas ${recentHours} horas`;
  return (
    <span className={`session-status session-status--${status}`} title={title}>
      <span className="session-status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function SessionTime({ value, elapsed }: { value: string; elapsed?: string }) {
  const { time, day } = formatSessionTime(value);
  return (
    <>
      <span className="active-sessions-time">{time}</span>
      <small className="active-sessions-day">{[day, elapsed].filter(Boolean).join(' · ')}</small>
    </>
  );
}

// Só UX: a API devolve 403 para qualquer perfil que não seja SuperAdministrador.
export function ActiveSessionsPanel({ session }: Props) {
  const isSuperAdmin = session.user.perfilId === SUPER_ADMIN_PROFILE_ID;
  const [sortBy, setSortBy] = useState<SessionSortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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
  // API anterior ao #331 não devolve `recentes`: a tabela mostra só quem está online.
  const hasRecent = Array.isArray(data?.recentes);
  const recent = hasRecent ? data!.recentes! : [];
  const recentHours = typeof data?.janelaRecenteHoras === 'number' ? data.janelaRecenteHoras : DEFAULT_RECENT_WINDOW_HOURS;
  const rows = sortSessionRows([
    ...items.map((item): SessionRow => ({ ...item, status: 'online' })),
    ...recent.map((item): SessionRow => ({ ...item, status: 'recent' })),
  ], sortBy, sortDirection);
  const clinics = Array.isArray(data?.porClinica) ? data.porClinica : [];
  const now = parseApiInstant(data?.geradoEm) ?? new Date();
  const loading = sessionsQuery.isPending;

  const changeSort = (field: SessionSortField) => {
    if (field === sortBy) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDirection(defaultDirectionFor(field));
  };

  return (
    <DataPanel>
      <section className="active-sessions" aria-labelledby="active-sessions-title">
        <div className="active-sessions-header">
          <div className="active-sessions-heading">
            <span className="eyebrow">Somente SuperAdministrador</span>
            <h2 id="active-sessions-title">
              {typeof data?.usuariosOnline === 'number' ? `${data.usuariosOnline} ${data.usuariosOnline === 1 ? 'usuário online' : 'usuários online'}` : 'Usuários online'}
            </h2>
            {data && (
              <p className="active-sessions-hint">
                Online: atividade nos últimos {data.janelaOciosidadeMinutos} minutos{hasRecent && <> · Recente: online nas últimas {recentHours} horas</>}
              </p>
            )}
          </div>
          <IconButton label="Atualizar sessões ativas" onClick={() => void sessionsQuery.refetch()}>
            <RefreshCw size={18} />
          </IconButton>
        </div>

        {data && (
          <ul className="active-sessions-summary" aria-label="Resumo das sessões">
            <li><StatusBadge status="online" recentHours={recentHours} /><strong>{data.usuariosOnline}</strong></li>
            {hasRecent && <li><StatusBadge status="recent" recentHours={recentHours} /><strong>{recent.length}</strong></li>}
            <li><span>Sessões ativas</span><strong>{data.totalSessoes}</strong></li>
          </ul>
        )}

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
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <SortableTableHeader key={column.field} field={column.field} label={column.label}
                    activeField={sortBy} direction={sortDirection} onSortChange={changeSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="empty-row"><span role="status">Carregando sessões...</span></td></tr>
                : !data ? <tr><td colSpan={7} className="empty-row">Sessões indisponíveis.</td></tr>
                : rows.length === 0 ? <tr><td colSpan={7} className="empty-row">Nenhum usuário online agora.</td></tr>
                  : rows.map((item, index) => (
                    <tr key={`${item.status}-${item.usuarioGlobalId}-${item.clinicaId}-${item.inicio}-${index}`}
                      className={item.status === 'recent' ? 'active-sessions-row--recent' : undefined}>
                      <td data-label="Status"><StatusBadge status={item.status} recentHours={recentHours} /></td>
                      <td data-label="Usuário">
                        <strong>{item.nome}</strong>
                        {item.viaEquipe && <small className="active-sessions-team">via equipe</small>}
                      </td>
                      <td data-label="Perfil">{item.perfil}</td>
                      <td data-label="Clínica">{item.clinica}</td>
                      <td data-label="Início"><SessionTime value={item.inicio} /></td>
                      <td data-label="Última atividade"><SessionTime value={item.ultimaAtividade} elapsed={formatElapsed(item.ultimaAtividade, now)} /></td>
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
