import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

type Stat = { label: string; value: number; icon: LucideIcon; color: string };
export function DashboardStats({ items, loading, available }: { items: Stat[]; loading: boolean; available: boolean }) {
  if (!items.length) return null;
  return <section className="dashboard-stats" aria-label="Indicadores da clínica" aria-busy={loading}>
    {items.map(({ label, value, color, icon: Icon }) => <div className="dashboard-stat" key={label} style={{ '--stat-color': color } as CSSProperties}>
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      {loading ? <span className="dashboard-skeleton" role="status" aria-label="Carregando indicador" />
        : <strong>{available ? value.toLocaleString('pt-BR') : <span role="status" aria-label="Indicador indisponível">—</span>}</strong>}
    </div>)}
  </section>;
}
