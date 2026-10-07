import { ChevronLeft, ChevronRight, RefreshCw, Shield } from 'lucide-react';
import type { AuthSession } from '../../types';
import { AlertMessage, DataPanel } from '../../shared/components/ui';
import { useSecurityObservations } from './useSecurityObservations';
import { securityEventLabels, securityLabel, securityOperationLabels, securityReasonLabels } from './securityObservationLabels';

export function SecurityMonitoringPanel({ session }: { session: AuthSession }) {
  const state = useSecurityObservations(session);
  const result = state.result;
  if (!state.allowed) return <AlertMessage type="error">Acesso aos eventos de segurança não permitido.</AlertMessage>;
  return (
    <section className="monitoring-workspace security-monitoring" aria-labelledby="security-monitoring-title" data-private="true">
      <DataPanel className="monitoring-hero">
        <div>
          <span className="eyebrow">Observabilidade de segurança</span>
          <h2 id="security-monitoring-title">Eventos de segurança</h2>
          <p>{state.global ? 'Visão global da plataforma' : 'Eventos da clínica atual'}. Dados autorizados pela API.</p>
          <p>Os padrões apresentados são observacionais e não bloqueiam o acesso.</p>
        </div>
        <button type="button" className="secondary-action" disabled={state.loading} onClick={state.reload}>
          <RefreshCw size={17} />Atualizar eventos
        </button>
      </DataPanel>
      {state.error && <AlertMessage type="error">{state.error}</AlertMessage>}
      <div className="monitoring-list" aria-live="polite" aria-busy={state.loading}>
        {state.loading && <DataPanel className="monitoring-empty">Carregando eventos de segurança...</DataPanel>}
        {!state.loading && !state.error && result?.items.length === 0 && (
          <DataPanel className="monitoring-empty">Nenhum evento de segurança nesta página.</DataPanel>
        )}
        {!state.loading && !state.error && result?.items.map((item, index) => (
          <DataPanel className="monitoring-error-card security-event-card" key={`${item.timestamp}-${index}`}>
            <header>
              <Shield size={19} aria-hidden="true" />
              <div><h3>{securityLabel(securityEventLabels, item.kind, 'Evento não identificado')}</h3></div>
              <time dateTime={item.timestamp}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(item.timestamp))}</time>
            </header>
            <dl className="monitoring-metadata">
              <div><dt>Operação</dt><dd>{securityLabel(securityOperationLabels, item.operation, 'Não especificada')}</dd></div>
              <div><dt>Motivo</dt><dd>{securityLabel(securityReasonLabels, item.reason, 'Não especificado')}</dd></div>
              {state.global && <div><dt>Clínica</dt><dd>{item.clinicId === null ? 'Plataforma / pré-login' : `Clínica ${item.clinicId}`}</dd></div>}
            </dl>
          </DataPanel>
        ))}
      </div>
      {!state.loading && !state.error && result && (
        <nav className="monitoring-pagination" aria-label="Paginação dos eventos de segurança">
          <span>Página {result.page} · {result.items.length} evento(s) nesta página</span>
          <div>
            <button type="button" className="secondary-action" aria-label="Página anterior de eventos" disabled={state.page <= 1} onClick={() => state.setPage(page => page - 1)}><ChevronLeft size={17} /></button>
            <button type="button" className="secondary-action" aria-label="Próxima página de eventos" disabled={result.items.length < result.pageSize || state.page >= 100} onClick={() => state.setPage(page => page + 1)}><ChevronRight size={17} /></button>
          </div>
        </nav>
      )}
    </section>
  );
}
