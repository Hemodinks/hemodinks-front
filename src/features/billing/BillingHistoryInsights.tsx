import type { CSSProperties } from 'react';
import { BarChart3, CircleDollarSign, PieChart, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { DataPanel } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { getBillingQuarterHighlights } from './billingHistory';
import type { BillingHistoryMonth, BillingHistoryYear } from './billingHistory';

const QUARTER_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#d97706'];

type BillingHistoryYearPickerProps = {
  years: BillingHistoryYear[];
  selectedYear: number;
  onChange: (year: number) => void;
};

function BillingHistoryYearPicker({ years, selectedYear, onChange }: BillingHistoryYearPickerProps) {
  return (
    <div className="billing-history-year-picker" role="group" aria-label="Ano exibido">
      {years.map((year) => (
        <button
          type="button"
          className={selectedYear === year.year ? 'is-active' : ''}
          aria-pressed={selectedYear === year.year}
          onClick={() => onChange(year.year)}
          key={year.year}
        >
          {year.year}
        </button>
      ))}
    </div>
  );
}

type QuarterlyDashboardProps = BillingHistoryYearPickerProps & {
  year: BillingHistoryYear;
};

export function QuarterlyDashboard({ year, years, selectedYear, onChange }: QuarterlyDashboardProps) {
  const quarters = getBillingQuarterHighlights(year);

  return (
    <DataPanel className="billing-history-quarter-dashboard">
      <div className="billing-history-section-header">
        <div>
          <span className="eyebrow">Destaques trimestrais</span>
          <h3>Meses de maior e menor faturamento</h3>
          <p>Os mesmos destaques de cor são aplicados aos meses nos accordions abaixo.</p>
        </div>
        <BillingHistoryYearPicker years={years} selectedYear={selectedYear} onChange={onChange} />
      </div>
      <div className="billing-history-quarter-grid">
        {quarters.map((quarter) => (
          <article className="billing-history-quarter-card" key={quarter.quarter}>
            <div className="billing-history-quarter-title">
              <strong>{quarter.quarter}º trimestre</strong>
              <span>{formatCurrency(quarter.totalGrossAmount)}</span>
            </div>
            <div className="billing-history-quarter-highlight is-highest">
              <TrendingUp size={18} aria-hidden="true" />
              <span><small>Maior faturamento</small><strong>{quarter.highestMonth.name}</strong></span>
              <b>{formatCurrency(quarter.highestMonth.summary.totalGrossAmount)}</b>
            </div>
            <div className="billing-history-quarter-highlight is-lowest">
              <TrendingDown size={18} aria-hidden="true" />
              <span><small>Menor faturamento</small><strong>{quarter.lowestMonth.name}</strong></span>
              <b>{formatCurrency(quarter.lowestMonth.summary.totalGrossAmount)}</b>
            </div>
          </article>
        ))}
      </div>
    </DataPanel>
  );
}

type BillingHistoryChartsProps = BillingHistoryYearPickerProps & {
  year: BillingHistoryYear;
};

export function BillingHistoryCharts({ year, years, selectedYear, onChange }: BillingHistoryChartsProps) {
  const quarters = getBillingQuarterHighlights(year);
  const maximumMonthlyAmount = Math.max(...year.months.map((month) => month.summary.totalGrossAmount), 1);
  const annualAmount = year.summary.totalGrossAmount;
  let accumulatedPercentage = 0;
  const pieStops = quarters.flatMap((quarter, index) => {
    const start = accumulatedPercentage;
    accumulatedPercentage += annualAmount > 0 ? (quarter.totalGrossAmount / annualAmount) * 100 : 25;
    return [`${QUARTER_COLORS[index]} ${start}%`, `${QUARTER_COLORS[index]} ${accumulatedPercentage}%`];
  });
  const pieStyle = { '--billing-history-pie': `conic-gradient(${pieStops.join(', ')})` } as CSSProperties;

  return (
    <div className="billing-history-charts-view">
      <DataPanel className="billing-history-charts-heading">
        <div className="billing-history-section-header">
          <div>
            <span className="eyebrow">Visão gráfica</span>
            <h3>Faturamento de {year.year}</h3>
            <p>Compare a evolução mensal e a participação de cada trimestre no total anual.</p>
          </div>
          <BillingHistoryYearPicker years={years} selectedYear={selectedYear} onChange={onChange} />
        </div>
      </DataPanel>

      <div className="billing-history-charts-grid">
        <DataPanel className="billing-history-chart-panel billing-history-bar-panel">
          <div className="billing-history-chart-title"><BarChart3 size={21} /><div><h3>Faturamento por mês</h3><p>Total bruto mensal</p></div></div>
          <div className="billing-history-bar-chart" aria-label={`Gráfico de barras do faturamento mensal de ${year.year}`}>
            {year.months.map((month) => {
              const height = month.summary.totalGrossAmount > 0
                ? Math.max((month.summary.totalGrossAmount / maximumMonthlyAmount) * 100, 4)
                : 1;
              return (
                <div className="billing-history-bar-column" key={month.month}>
                  <span className="billing-history-bar-value">{formatCurrency(month.summary.totalGrossAmount)}</span>
                  <div className="billing-history-bar-track"><span style={{ height: `${height}%` }} /></div>
                  <strong>{month.name.slice(0, 3)}</strong>
                </div>
              );
            })}
          </div>
        </DataPanel>

        <DataPanel className="billing-history-chart-panel billing-history-pie-panel">
          <div className="billing-history-chart-title"><PieChart size={21} /><div><h3>Participação por trimestre</h3><p>Distribuição do total anual</p></div></div>
          <div className="billing-history-pie-layout">
            <div className="billing-history-pie" style={pieStyle} role="img" aria-label={`Gráfico circular do faturamento trimestral de ${year.year}`}>
              <span><small>Total anual</small><strong>{formatCurrency(annualAmount)}</strong></span>
            </div>
            <ul className="billing-history-pie-legend">
              {quarters.map((quarter, index) => (
                <li key={quarter.quarter}>
                  <i style={{ backgroundColor: QUARTER_COLORS[index] }} />
                  <span><strong>{quarter.quarter}º trimestre</strong><small>{annualAmount > 0 ? `${((quarter.totalGrossAmount / annualAmount) * 100).toFixed(1)}%` : '0,0%'}</small></span>
                  <b>{formatCurrency(quarter.totalGrossAmount)}</b>
                </li>
              ))}
            </ul>
          </div>
        </DataPanel>
      </div>
    </div>
  );
}

export function BillingHistoryMonthSummary({ month }: { month: BillingHistoryMonth }) {
  const summary = month.summary;
  return (
    <section className="billing-history-month-summary" aria-label={`Resumo financeiro de ${month.name}`}>
      <div className="billing-history-month-summary-heading">
        <div><span className="eyebrow">Composição mensal</span><h3>Total faturado em {month.name}</h3></div>
        <strong>{formatCurrency(summary.totalGrossAmount)}</strong>
      </div>
      <div className="billing-history-month-summary-grid">
        <article className="is-gross"><Wallet size={19} /><span><small>Total faturado</small><strong>{formatCurrency(summary.totalGrossAmount)}</strong></span></article>
        <article className="is-glosa"><TrendingDown size={19} /><span><small>Total de glosas</small><strong>{formatCurrency(summary.totalGlosaAmount)}</strong></span></article>
        <article className="is-net"><CircleDollarSign size={19} /><span><small>Total líquido</small><strong>{formatCurrency(summary.totalNetAmount)}</strong></span></article>
        <article><ReceiptText size={19} /><span><small>Atendimentos</small><strong>{summary.totalRecords}</strong></span></article>
        <article><TrendingUp size={19} /><span><small>Pagos</small><strong>{summary.paidCount}</strong></span></article>
        <article><TrendingDown size={19} /><span><small>Pendentes</small><strong>{summary.pendingCount + summary.missingAmountCount}</strong></span></article>
      </div>
    </section>
  );
}
