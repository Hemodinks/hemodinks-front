import type { LucideIcon } from 'lucide-react';

type Stat = { label: string; value: number; icon: LucideIcon };
export function DashboardStats({ items, loading, available }: { items: Stat[]; loading: boolean; available: boolean }) {
  if (!items.length) return null;
  return <section className="dashboard-stats" aria-label="Indicadores da clínica" aria-busy={loading}>
    {items.map(({ label, value, icon: Icon }) => <div className="dashboard-stat" key={label}>
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      {loading ? <span className="dashboard-skeleton" aria-label="Carregando indicador" />
        : <strong aria-label={available ? undefined : 'Indicador indisponível'}>{available ? value.toLocaleString('pt-BR') : '—'}</strong>}
    </div>)}
  </section>;
}
