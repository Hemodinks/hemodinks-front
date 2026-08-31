import { useState } from 'react';
import { BarChart3, CircleDollarSign, PieChart, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { DataPanel } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { getBillingQuarterHighlights, getBillingQuarterPerformanceTone } from './billingHistory';
import type { BillingHistoryMonth, BillingHistoryYear } from './billingHistory';

const QUARTER_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#d97706'];

function formatPercentage(value: number) {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

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
          <article className={`billing-history-quarter-card is-${getBillingQuarterPerformanceTone(quarter.quarter, quarters)}`} key={quarter.quarter}>
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
  const [activeQuarter, setActiveQuarter] = useState<number | null>(null);
  const quarters = getBillingQuarterHighlights(year);
  const maximumMonthlyAmount = Math.max(...year.months.map((month) => month.summary.totalGrossAmount), 1);
  const annualAmount = year.summary.totalGrossAmount;
  let accumulatedPercentage = 0;
  const quarterMetrics = quarters.map((quarter, index) => {
    const start = accumulatedPercentage;
    const percentage = annualAmount > 0 ? (quarter.totalGrossAmount / annualAmount) * 100 : 0;
    accumulatedPercentage += percentage;
    return {
      quarter,
      color: QUARTER_COLORS[index],
      percentage,
      start,
    };
  });
  const activeQuarterMetric = quarterMetrics.find(({ quarter }) => quarter.quarter === activeQuarter) ?? null;

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
              const quarter = Math.ceil(month.month / 3);
              const tooltipId = `billing-bar-tooltip-${year.year}-${month.month}`;
              return (
                <div
                  className="billing-history-bar-column"
                  tabIndex={0}
                  aria-describedby={tooltipId}
                  aria-label={`${month.name} de ${year.year}, ${quarter}º trimestre, ${formatCurrency(month.summary.totalGrossAmount)}`}
                  key={month.month}
                >
                  <span className="billing-history-chart-tooltip" id={tooltipId} role="tooltip">
                    <strong>{month.name} de {year.year}</strong>
                    <small>{quarter}º trimestre</small>
                    <b>{formatCurrency(month.summary.totalGrossAmount)}</b>
                  </span>
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
            <div
              className="billing-history-pie"
              role="group"
              aria-label={`Gráfico circular do faturamento trimestral de ${year.year}`}
              onMouseLeave={() => setActiveQuarter(null)}
            >
              <svg className="billing-history-pie-svg" viewBox="0 0 240 240" role="group" aria-label={`Participação dos trimestres no faturamento de ${year.year}`}>
                <circle className="billing-history-pie-track" cx="120" cy="120" r="88" pathLength="100" />
                {quarterMetrics.filter(({ percentage }) => percentage > 0).map(({ quarter, color, percentage, start }) => {
                  const monthsLabel = `${quarter.months[0].name} a ${quarter.months[2].name}`;
                  return (
                    <circle
                      className="billing-history-pie-slice"
                      cx="120"
                      cy="120"
                      r="88"
                      pathLength="100"
                      fill="none"
                      stroke={color}
                      strokeDasharray={`${percentage} ${100 - percentage}`}
                      strokeDashoffset={-start}
                      tabIndex={0}
                      aria-label={`${quarter.quarter}º trimestre de ${year.year}, ${monthsLabel}, ${formatCurrency(quarter.totalGrossAmount)}, ${formatPercentage(percentage)} do total anual`}
                      onMouseEnter={() => setActiveQuarter(quarter.quarter)}
                      onFocus={() => setActiveQuarter(quarter.quarter)}
                      onBlur={() => setActiveQuarter(null)}
                      key={quarter.quarter}
                    />
                  );
                })}
              </svg>
              <span className="billing-history-pie-total"><small>Total anual</small><strong>{formatCurrency(annualAmount)}</strong></span>
              {activeQuarterMetric && (
                <span className="billing-history-chart-tooltip is-pie is-visible" role="tooltip">
                  <strong><i style={{ backgroundColor: activeQuarterMetric.color }} />{activeQuarterMetric.quarter.quarter}º trimestre de {year.year}</strong>
                  <small>{activeQuarterMetric.quarter.months[0].name} a {activeQuarterMetric.quarter.months[2].name}</small>
                  <b>{formatCurrency(activeQuarterMetric.quarter.totalGrossAmount)} · {formatPercentage(activeQuarterMetric.percentage)}</b>
                  {activeQuarterMetric.percentage === 0 && <small>Sem participação no faturamento anual.</small>}
                </span>
              )}
            </div>
            <ul className="billing-history-pie-legend">
              {quarterMetrics.map(({ quarter, color, percentage }) => (
                <li className={activeQuarter === quarter.quarter ? 'is-active' : ''} key={quarter.quarter}>
                  <button
                    type="button"
                    aria-label={`Consultar ${quarter.quarter}º trimestre de ${year.year}, ${quarter.months[0].name} a ${quarter.months[2].name}`}
                    onMouseEnter={() => setActiveQuarter(quarter.quarter)}
                    onMouseLeave={() => setActiveQuarter(null)}
                    onFocus={() => setActiveQuarter(quarter.quarter)}
                    onBlur={() => setActiveQuarter(null)}
                  >
                    <i style={{ backgroundColor: color }} />
                    <span><strong>{quarter.quarter}º trimestre</strong><small>{percentage > 0 ? formatPercentage(percentage) : 'Sem faturamento'}</small></span>
                    <b>{formatCurrency(quarter.totalGrossAmount)}</b>
                  </button>
                </li>
              ))}
            </ul>
            <p className="billing-history-pie-note">Trimestres sem faturamento permanecem na legenda, mas não ocupam uma fatia do gráfico.</p>
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
