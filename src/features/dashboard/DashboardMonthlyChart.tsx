import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { DashboardMonthlyBilling } from '../../types';
import { formatCurrency } from '../../shared/utils/formatters';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Escala "redonda" para o eixo: 1, 2, 2,5 ou 5 vezes uma potência de 10.
function niceMaximum(value: number) {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

function compactCurrency(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

const monthLabel = (item: DashboardMonthlyBilling) => `${MONTHS[item.mes - 1]}/${String(item.ano).slice(2)}`;

type Props = { items: DashboardMonthlyBilling[]; onOpenHistory?: () => void };

export function DashboardMonthlyChart({ items, onOpenHistory }: Props) {
  const [active, setActive] = useState<number | null>(null);
  if (!items.length) return null;
  const maximum = niceMaximum(Math.max(...items.map((item) => Math.max(item.faturado, item.recebido))));
  const ticks = [maximum, maximum * 0.75, maximum * 0.5, maximum * 0.25, 0];
  const height = (value: number) => `${Math.max((value / maximum) * 100, value > 0 ? 1.5 : 0)}%`;
  const activeItem = active == null ? null : items[active];
  const totals = items.reduce((sum, item) => ({ faturado: sum.faturado + item.faturado, recebido: sum.recebido + item.recebido }), { faturado: 0, recebido: 0 });

  return <section className="dashboard-section dashboard-chart-section" aria-labelledby="dashboard-chart-title">
    <div className="dashboard-chart-heading">
      <h3 id="dashboard-chart-title"><BarChart3 size={21} aria-hidden="true" />Faturamento das cirurgias · últimos 12 meses</h3>
      <ul className="dashboard-chart-legend" aria-label="Legenda">
        <li><span className="dashboard-chart-swatch is-billed" aria-hidden="true" />Faturado <strong>{compactCurrency(totals.faturado)}</strong></li>
        <li><span className="dashboard-chart-swatch is-received" aria-hidden="true" />Recebido <strong>{compactCurrency(totals.recebido)}</strong></li>
      </ul>
    </div>
    <div className="dashboard-chart" onMouseLeave={() => setActive(null)}>
      <div className="dashboard-chart-axis" aria-hidden="true">
        {ticks.map((tick) => <span key={tick}>{compactCurrency(tick)}</span>)}
      </div>
      <div className="dashboard-chart-plot">
        <div className="dashboard-chart-grid" aria-hidden="true">{ticks.map((tick) => <span key={tick} />)}</div>
        {items.map((item, index) => <button
          type="button"
          key={`${item.ano}-${item.mes}`}
          className={`dashboard-chart-month ${active === index ? 'is-active' : ''}`}
          aria-label={`${monthLabel(item)}: ${item.cirurgias} cirurgia(s), faturado ${formatCurrency(item.faturado)}, recebido ${formatCurrency(item.recebido)}`}
          onMouseEnter={() => setActive(index)}
          onFocus={() => setActive(index)}
          onBlur={() => setActive(null)}
          onClick={onOpenHistory}
        >
          <span className="dashboard-chart-bars" aria-hidden="true">
            <span className="dashboard-chart-bar is-billed" style={{ height: height(item.faturado) }} />
            <span className="dashboard-chart-bar is-received" style={{ height: height(item.recebido) }} />
          </span>
          <span className="dashboard-chart-label" aria-hidden="true">{monthLabel(item)}</span>
        </button>)}
        {activeItem && <div
          className="dashboard-chart-tooltip"
          role="status"
          style={{ left: `${((active! + 0.5) / items.length) * 100}%` }}
        >
          <strong>{monthLabel(activeItem)}</strong>
          <span>{activeItem.cirurgias} cirurgia(s)</span>
          <span><i className="dashboard-chart-swatch is-billed" aria-hidden="true" />Faturado {formatCurrency(activeItem.faturado)}</span>
          <span><i className="dashboard-chart-swatch is-received" aria-hidden="true" />Recebido {formatCurrency(activeItem.recebido)}</span>
        </div>}
      </div>
    </div>
    <details className="dashboard-chart-table">
      <summary>Ver dados em tabela</summary>
      <table>
        <caption className="sr-only">Faturamento das cirurgias por mês de consolidação</caption>
        <thead><tr><th scope="col">Mês</th><th scope="col">Cirurgias</th><th scope="col">Faturado</th><th scope="col">Recebido</th></tr></thead>
        <tbody>{items.map((item) => <tr key={`${item.ano}-${item.mes}`}>
          <th scope="row">{monthLabel(item)}</th><td>{item.cirurgias}</td><td>{formatCurrency(item.faturado)}</td><td>{formatCurrency(item.recebido)}</td>
        </tr>)}</tbody>
      </table>
    </details>
  </section>;
}
