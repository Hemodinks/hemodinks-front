import type { CSSProperties } from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

export type DashboardAction = { label: string; color: string; icon: LucideIcon; onOpen: () => void };
export function DashboardQuickActions({ actions }: { actions: DashboardAction[] }) {
  if (!actions.length) return null;
  return <section className="dashboard-section" aria-labelledby="dashboard-actions-title">
    <h3 id="dashboard-actions-title">Ações rápidas</h3>
    <div className="dashboard-actions">
      {actions.map(({ label, color, icon: Icon, onOpen }) => <button type="button" key={label} onClick={onOpen} style={{ '--action-color': color } as CSSProperties}>
        <Icon size={20} aria-hidden="true" /><span>{label}</span><ArrowUpRight size={16} aria-hidden="true" />
      </button>)}
    </div>
  </section>;
}
