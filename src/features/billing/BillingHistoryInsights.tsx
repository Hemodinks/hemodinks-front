import { useEffect, useState } from 'react';
import { BarChart3, CircleDollarSign, PieChart, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { DataPanel } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { getBillingQuarterHighlights, getBillingQuarterPerformanceTone } from './billingHistory';
import type { BillingHistoryMonth, BillingHistoryYear } from './billingHistory';

const QUARTER_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c'];

function formatPercentage(value: number) {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function getChartMaximum(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function formatChartAxisValue(value: number) {
  if (value === 0) return 'R$ 0';
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
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
  const annualGrossAmount = year.summary.totalGrossAmount;

  return (
    <DataPanel className="billing-history-quarter-dashboard">
      <div className="billing-history-section-header">
        <div>
          <span className="eyebrow">Destaques trimestrais</span>
          <h3>Comparativo trimestral de faturamento</h3>
          <p>Compare os maiores e menores faturamentos do ano. Empates e valores zerados permanecem neutros.</p>
        </div>
        <BillingHistoryYearPicker years={years} selectedYear={selectedYear} onChange={onChange} />
      </div>
      <div className="billing-history-quarter-legend" aria-label="Legenda dos destaques trimestrais">
        <span className="is-most-profitable"><i />Maior faturamento</span>
        <span className="is-least-profitable"><i />Menor faturamento</span>
        <span className="is-neutral"><i />Empate ou sem faturamento</span>
      </div>
      <div className="billing-history-quarter-grid">
        {quarters.map((quarter) => {
          const tone = getBillingQuarterPerformanceTone(quarter.quarter, quarters);
          const participation = annualGrossAmount > 0 ? (quarter.totalGrossAmount / annualGrossAmount) * 100 : 0;
          const monthsWithBilling = quarter.months.filter((month) => month.summary.totalGrossAmount > 0);
          const highestAmount = Math.max(...monthsWithBilling.map((month) => month.summary.totalGrossAmount), 0);
          const lowestAmount = monthsWithBilling.length
            ? Math.min(...monthsWithBilling.map((month) => month.summary.totalGrossAmount))
            : 0;
          const highestMonths = monthsWithBilling.filter((month) => month.summary.totalGrossAmount === highestAmount);
          const lowestMonths = monthsWithBilling.filter((month) => month.summary.totalGrossAmount === lowestAmount);
          const toneLabel = tone === 'most-profitable'
            ? 'Maior faturamento'
            : tone === 'least-profitable'
              ? 'Menor faturamento'
              : quarter.totalGrossAmount === 0 ? 'Sem faturamento' : 'Empate';

          return <article className={`billing-history-quarter-card is-${tone}`} key={quarter.quarter}>
            <div className="billing-history-quarter-title">
              <strong>{quarter.quarter}º trimestre</strong>
              <span className={`billing-history-quarter-badge is-${tone}`}>{toneLabel}</span>
            </div>
            <div className="billing-history-quarter-total">
              <strong>{formatCurrency(quarter.totalGrossAmount)}</strong>
              <small>{formatPercentage(participation)} do faturamento anual</small>
            </div>
            {monthsWithBilling.length > 0 ? <>
              <div className="billing-history-quarter-highlight">
                <TrendingUp className="is-highest" size={18} aria-hidden="true" />
                <span><small>{highestMonths.length > 1 ? 'Empate no maior mês' : 'Maior mês'}</small><strong>{highestMonths.map((month) => month.name).join(' e ')}</strong></span>
                <b>{formatCurrency(highestAmount)}</b>
              </div>
              {monthsWithBilling.length > 1 && (
                <div className="billing-history-quarter-highlight">
                  <TrendingDown className="is-lowest" size={18} aria-hidden="true" />
                  <span><small>{lowestMonths.length > 1 ? 'Empate no menor mês' : 'Menor mês'}</small><strong>{lowestMonths.map((month) => month.name).join(' e ')}</strong></span>
                  <b>{formatCurrency(lowestAmount)}</b>
                </div>
              )}
            </> : (
              <div className="billing-history-quarter-empty"><ReceiptText size={18} aria-hidden="true" /><span><strong>Sem faturamento</strong><small>Nenhum mês possui valor informado.</small></span></div>
            )}
          </article>;
        })}
      </div>
    </DataPanel>
  );
}

type BillingHistoryChartsProps = BillingHistoryYearPickerProps & {
  year: BillingHistoryYear;
};

export function BillingHistoryCharts({ year, years, selectedYear, onChange }: BillingHistoryChartsProps) {
  const [hoveredQuarter, setHoveredQuarter] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);

  useEffect(() => {
    setHoveredQuarter(null);
    setSelectedQuarter(null);
  }, [year.year]);

  const quarters = getBillingQuarterHighlights(year);
  const positiveMonths = year.months.filter((month) => month.summary.totalGrossAmount > 0);
  const maximumMonthlyAmount = Math.max(...positiveMonths.map((month) => month.summary.totalGrossAmount), 0);
  const chartMaximum = getChartMaximum(maximumMonthlyAmount);
  const chartTicks = Array.from({ length: 5 }, (_, index) => chartMaximum - (chartMaximum / 4) * index);
  const annualAmount = year.summary.totalGrossAmount;
  const averageMonthlyAmount = annualAmount / 12;
  const highestMonth = positiveMonths.reduce<BillingHistoryMonth | null>((current, month) => (
    !current || month.summary.totalGrossAmount > current.summary.totalGrossAmount ? month : current
  ), null);
  const lowestMonth = positiveMonths.reduce<BillingHistoryMonth | null>((current, month) => (
    !current || month.summary.totalGrossAmount < current.summary.totalGrossAmount ? month : current
  ), null);
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
  const largestQuarterAmount = Math.max(...quarters.map((quarter) => quarter.totalGrossAmount), 0);
  const activeQuarter = hoveredQuarter ?? selectedQuarter;
  const activeQuarterMetric = quarterMetrics.find(({ quarter }) => quarter.quarter === activeQuarter) ?? null;
  const toggleQuarter = (quarter: number, hasBilling: boolean) => {
    if (!hasBilling) return;
    setSelectedQuarter((current) => current === quarter ? null : quarter);
  };

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

      <section className="billing-history-chart-kpis" aria-label={`Indicadores de faturamento de ${year.year}`}>
        <article className="is-annual"><Wallet size={20} aria-hidden="true" /><span><small>Faturamento anual</small><strong>{formatCurrency(annualAmount)}</strong></span></article>
        <article className="is-average"><CircleDollarSign size={20} aria-hidden="true" /><span><small>Média mensal · 12 meses</small><strong>{formatCurrency(averageMonthlyAmount)}</strong></span></article>
        <article className="is-highest"><TrendingUp size={20} aria-hidden="true" /><span><small>Melhor mês</small><strong>{highestMonth ? highestMonth.name : 'Sem faturamento'}</strong>{highestMonth && <b>{formatCurrency(highestMonth.summary.totalGrossAmount)}</b>}</span></article>
        <article className="is-lowest"><TrendingDown size={20} aria-hidden="true" /><span><small>Menor mês com faturamento</small><strong>{lowestMonth ? lowestMonth.name : 'Sem faturamento'}</strong>{lowestMonth && <b>{formatCurrency(lowestMonth.summary.totalGrossAmount)}</b>}</span></article>
      </section>

      <div className="billing-history-charts-grid">
        <DataPanel className="billing-history-chart-panel billing-history-bar-panel">
          <div className="billing-history-chart-title"><BarChart3 size={21} /><div><h3>Faturamento por mês</h3><p>Total bruto mensal</p></div></div>
          <div className="billing-history-bar-chart" role="group" aria-label={`Gráfico de barras do faturamento mensal de ${year.year}`}>
            <div className="billing-history-bar-axis" aria-hidden="true">
              {chartTicks.map((tick) => <span key={tick}>{formatChartAxisValue(tick)}</span>)}
            </div>
            <div className="billing-history-bar-plot">
              {year.months.map((month) => {
              const height = month.summary.totalGrossAmount > 0
                ? Math.max((month.summary.totalGrossAmount / chartMaximum) * 100, 3)
                : 0;
              const quarter = Math.ceil(month.month / 3);
              const tooltipId = `billing-bar-tooltip-${year.year}-${month.month}`;
              return (
                <div
                  className={`billing-history-bar-column${activeQuarter === quarter ? ' is-active' : ''}${activeQuarter !== null && activeQuarter !== quarter ? ' is-muted' : ''}`}
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
                  <span className="billing-history-bar-value">{month.summary.totalGrossAmount > 0 ? formatCurrency(month.summary.totalGrossAmount) : ''}</span>
                  <div className="billing-history-bar-track"><span className={height === 0 ? 'is-zero' : ''} style={{ height: `${height}%` }} /></div>
                  <strong>{month.name.slice(0, 3)}</strong>
                </div>
              );
              })}
            </div>
          </div>
          <p className="billing-history-chart-help">Passe o mouse ou use o teclado para consultar o valor completo de cada mês.</p>
        </DataPanel>

        <DataPanel className="billing-history-chart-panel billing-history-pie-panel">
          <div className="billing-history-chart-title"><PieChart size={21} /><div><h3>Participação por trimestre</h3><p>Distribuição do total anual</p></div></div>
          <div className="billing-history-pie-layout">
            <div
              className="billing-history-pie"
              role="group"
              aria-label={`Gráfico circular do faturamento trimestral de ${year.year}`}
              onMouseLeave={() => setHoveredQuarter(null)}
            >
              <svg className="billing-history-pie-svg" viewBox="0 0 240 240" role="group" aria-label={`Participação dos trimestres no faturamento de ${year.year}`}>
                <circle className="billing-history-pie-track" cx="120" cy="120" r="88" pathLength="100" />
                {quarterMetrics.filter(({ percentage }) => percentage > 0).map(({ quarter, color, percentage, start }) => {
                  const monthsLabel = `${quarter.months[0].name} a ${quarter.months[2].name}`;
                  return (
                    <circle
                      className={`billing-history-pie-slice${quarter.totalGrossAmount === largestQuarterAmount ? ' is-largest' : ''}${activeQuarter === quarter.quarter ? ' is-active' : ''}${activeQuarter !== null && activeQuarter !== quarter.quarter ? ' is-muted' : ''}`}
                      cx="120"
                      cy="120"
                      r="88"
                      pathLength="100"
                      fill="none"
                      stroke={color}
                      strokeDasharray={`${percentage} ${100 - percentage}`}
                      strokeDashoffset={-start}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedQuarter === quarter.quarter}
                      aria-label={`${quarter.quarter}º trimestre de ${year.year}, ${monthsLabel}, ${formatCurrency(quarter.totalGrossAmount)}, ${formatPercentage(percentage)} do total anual`}
                      onMouseEnter={() => setHoveredQuarter(quarter.quarter)}
                      onFocus={() => setHoveredQuarter(quarter.quarter)}
                      onBlur={() => setHoveredQuarter(null)}
                      onClick={() => toggleQuarter(quarter.quarter, true)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleQuarter(quarter.quarter, true);
                        }
                      }}
                      key={quarter.quarter}
                    />
                  );
                })}
              </svg>
              <span className="billing-history-pie-total">
                <small>{activeQuarterMetric ? `${activeQuarterMetric.quarter.quarter}º trimestre` : 'Total anual'}</small>
                <strong>{formatCurrency(activeQuarterMetric?.quarter.totalGrossAmount ?? annualAmount)}</strong>
              </span>
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
              {quarterMetrics.map(({ quarter, color, percentage }) => {
                const hasBilling = quarter.totalGrossAmount > 0;
                const isLargest = hasBilling && quarter.totalGrossAmount === largestQuarterAmount;
                return <li className={`${activeQuarter === quarter.quarter ? 'is-active ' : ''}${hasBilling ? '' : 'is-zero'}`} key={quarter.quarter}>
                  <button
                    type="button"
                    disabled={!hasBilling}
                    aria-pressed={selectedQuarter === quarter.quarter}
                    aria-label={`Consultar ${quarter.quarter}º trimestre de ${year.year}, ${quarter.months[0].name} a ${quarter.months[2].name}`}
                    onMouseEnter={() => setHoveredQuarter(quarter.quarter)}
                    onMouseLeave={() => setHoveredQuarter(null)}
                    onFocus={() => setHoveredQuarter(quarter.quarter)}
                    onBlur={() => setHoveredQuarter(null)}
                    onClick={() => toggleQuarter(quarter.quarter, hasBilling)}
                  >
                    <i style={{ backgroundColor: color }} />
                    <span><strong>{quarter.quarter}º trimestre</strong><small>{percentage > 0 ? formatPercentage(percentage) : 'Sem faturamento'}</small>{isLargest && <em>Maior participação</em>}</span>
                    <b>{formatCurrency(quarter.totalGrossAmount)}</b>
                  </button>
                </li>;
              })}
            </ul>
            <p className="billing-history-pie-note">Selecione um trimestre para destacar seus meses. Períodos sem faturamento não ocupam uma fatia.</p>
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
