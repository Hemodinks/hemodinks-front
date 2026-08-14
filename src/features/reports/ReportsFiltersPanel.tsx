import type { Dispatch, SetStateAction } from 'react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import { DateInput } from '../../shared/components/DateInput';
import { Button, CheckboxField, DataPanel, IconButton, MultiSelectComboboxField, SelectField } from '../../shared/components/ui';
import type { MultiSelectOption } from '../../shared/components/ui';
import { BILLING_REGIME_FILTER_OPTIONS, BILLING_STATUS_FILTER_OPTIONS } from '../billing/billingPageUtils';
import type { ReportExportFormat, ReportFilters } from './reportTypes';

type Options = Record<'doctors' | 'teams' | 'medicalGroups' | 'hospitals' | 'convenios' | 'procedures' | 'opmeSuppliers', MultiSelectOption[]>;

type Props = {
  filters: ReportFilters;
  setFilters: Dispatch<SetStateAction<ReportFilters>>;
  options: Options;
  resultCount: number;
  isFetching: boolean;
  exportLoading: boolean;
  onApply: () => void;
  onClear: () => void;
  onRefresh: () => void;
  onExport: (format: ReportExportFormat) => void;
};

const fields: Array<{ key: keyof Options; label: string; all: string }> = [
  { key: 'doctors', label: 'Médicos', all: 'Todos os médicos' },
  { key: 'teams', label: 'Equipes', all: 'Todas as equipes' },
  { key: 'medicalGroups', label: 'Grupos médicos', all: 'Todos os grupos médicos' },
  { key: 'hospitals', label: 'Hospitais', all: 'Todos os hospitais' },
  { key: 'convenios', label: 'Convênios', all: 'Todos os convênios' },
  { key: 'procedures', label: 'Procedimentos', all: 'Todos os procedimentos' },
  { key: 'opmeSuppliers', label: 'Fornecedores OPME', all: 'Todos os fornecedores' },
];

export function ReportsFiltersPanel(props: Props) {
  return (
    <DataPanel className="billing-filter-panel reports-filter-panel" data-tour="reports-filters">
      <details className="billing-filters-accordion" open>
        <summary className="billing-filters-summary">
          <div><span className="eyebrow">Consulta analítica</span><h2>{props.resultCount} atendimento(s) encontrados</h2></div>
          <span className="billing-filters-toggle">Filtros</span>
        </summary>
        <div className="billing-filters-content">
          <div className="reports-filter-grid">
            <DateInput id="report-request-start-date" label="Data inicial da solicitação" value={props.filters.requestStartDate} onChange={(requestStartDate) => props.setFilters((current) => ({ ...current, requestStartDate }))} />
            <DateInput id="report-request-end-date" label="Data final da solicitação" value={props.filters.requestEndDate} onChange={(requestEndDate) => props.setFilters((current) => ({ ...current, requestEndDate }))} />
            <div className="reports-period-tour-target" data-tour="reports-period">
              <DateInput id="report-start-date" label="Data inicial do atendimento" value={props.filters.startDate} onChange={(startDate) => props.setFilters((current) => ({ ...current, startDate }))} />
              <DateInput id="report-end-date" label="Data final do atendimento" value={props.filters.endDate} onChange={(endDate) => props.setFilters((current) => ({ ...current, endDate }))} />
            </div>
            <DateInput id="report-payment-start-date" label="Data inicial do pagamento" value={props.filters.paymentStartDate} max={props.filters.paymentEndDate || undefined} onChange={(paymentStartDate) => props.setFilters((current) => ({ ...current, paymentStartDate }))} />
            <DateInput id="report-payment-end-date" label="Data final do pagamento" value={props.filters.paymentEndDate} min={props.filters.paymentStartDate || undefined} onChange={(paymentEndDate) => props.setFilters((current) => ({ ...current, paymentEndDate }))} />
            {fields.map((field) => (
              <MultiSelectComboboxField
                key={field.key}
                className="filter-field"
                label={field.label}
                values={props.filters[field.key]}
                options={props.options[field.key]}
                onValuesChange={(values) => props.setFilters((current) => ({ ...current, [field.key]: values }))}
                allOptionLabel={field.all}
                placeholder={field.all}
                noOptionsLabel={`Nenhuma opção de ${field.label.toLowerCase()} encontrada.`}
                {...(field.key === 'doctors' ? { 'data-tour': 'reports-combined-filters' } : {})}
              />
            ))}
            <SelectField className="filter-field" label="Status" value={props.filters.status} onChange={(event) => props.setFilters((current) => ({ ...current, status: event.target.value as ReportFilters['status'] }))}>
              {BILLING_STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField className="filter-field" label="Regime" value={props.filters.regime} onChange={(event) => props.setFilters((current) => ({ ...current, regime: event.target.value as ReportFilters['regime'] }))}>
              {BILLING_REGIME_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <CheckboxField
              className="billing-checkbox reports-pending-filter"
              label="Mostrar apenas itens com pendências de faturamento"
              checked={props.filters.onlyPendingItems}
              onCheckedChange={(onlyPendingItems) => props.setFilters((current) => ({ ...current, onlyPendingItems }))}
            />
            <div className="billing-filter-actions reports-query-actions">
              <Button className="billing-apply-filters" variant="primary" onClick={props.onApply} disabled={props.isFetching} data-tour="reports-apply"><Search size={16} />Consultar</Button>
              <Button className="billing-clear-filters" onClick={props.onClear}>Limpar filtros</Button>
            </div>
          </div>
          <div className="reports-filter-actions" data-tour="reports-export">
            <IconButton label="Atualizar dados dos relatórios" title="Atualizar" onClick={props.onRefresh} disabled={props.isFetching}><RefreshCw size={18} /></IconButton>
            <Button className="reports-export-button reports-export-pdf" onClick={() => props.onExport('pdf')} disabled={props.exportLoading || !props.resultCount}><FileText size={17} />Exportar PDF</Button>
            <Button className="reports-export-button reports-export-xlsx" onClick={() => props.onExport('xlsx')} disabled={props.exportLoading || !props.resultCount}><Download size={17} />Exportar Planilha</Button>
          </div>
        </div>
      </details>
    </DataPanel>
  );
}
