import { ArrowRight, CalendarDays, CircleCheck, Bell, Wallet } from 'lucide-react';

type Props = {
  canAccessBilling: boolean; canAccessAgenda: boolean;
  pendingPaymentsCount: number; upcomingEventsCount: number; unreadAgendaNotificationCount: number;
  loading: boolean; available: boolean; onOpenBilling: () => void; onOpenAgenda: () => void;
};
export function DashboardPendingItems(props: Props) {
  const items = [
    ...(props.canAccessBilling && props.pendingPaymentsCount > 0 ? [{ label: `${props.pendingPaymentsCount.toLocaleString('pt-BR')} pendência(s) de faturamento`, icon: Wallet, onOpen: props.onOpenBilling }] : []),
    ...(props.canAccessAgenda && props.upcomingEventsCount > 0 ? [{ label: `${props.upcomingEventsCount.toLocaleString('pt-BR')} evento(s) próximo(s)`, icon: CalendarDays, onOpen: props.onOpenAgenda }] : []),
    ...(props.canAccessAgenda && props.unreadAgendaNotificationCount > 0 ? [{ label: `${props.unreadAgendaNotificationCount.toLocaleString('pt-BR')} aviso(s) não lido(s) na agenda`, icon: Bell, onOpen: props.onOpenAgenda }] : []),
  ];
  return <section className="dashboard-section dashboard-pending-section" aria-labelledby="dashboard-pending-title" aria-busy={props.loading}>
    <h3 id="dashboard-pending-title"><Bell size={21} aria-hidden="true" />Pendências e próximos eventos</h3>
    <div className="dashboard-pending">
      {props.loading ? <div className="dashboard-pending-state" role="status">Carregando pendências…</div>
        : !props.available ? <p className="dashboard-pending-state">Não foi possível consultar as pendências. Você ainda pode acessar os módulos pelo menu.</p>
        : items.length ? <ul>{items.map(({ label, icon: Icon, onOpen }) => <li key={label}>
          <button type="button" onClick={onOpen}><Icon size={20} aria-hidden="true" /><span>{label}</span><ArrowRight size={18} aria-hidden="true" /></button>
        </li>)}</ul>
        : <p className="dashboard-pending-state"><CircleCheck size={20} aria-hidden="true" /> Nenhuma pendência ou evento próximo nos módulos disponíveis.</p>}
    </div>
  </section>;
}
