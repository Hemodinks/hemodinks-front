import type { Dispatch, SetStateAction } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import {
  Button,
  CheckboxField,
  ComboboxField,
  DataPanel,
  IconButton,
  SearchField,
  SelectField,
} from '../../shared/components/ui';
import { formatPersonName } from '../../shared/utils/formatters';
import { BillingMonthField } from './BillingPageComponents';
import {
  BILLING_REGIME_FILTER_OPTIONS,
  BILLING_STATUS_FILTER_OPTIONS,
} from './billingPageUtils';
import type { BillingFilters } from './billingTypes';

type BillingFiltersPanelProps = {
  filters: BillingFilters;
  setFilters: Dispatch<SetStateAction<BillingFilters>>;
  resultCount: number;
  doctorOptions: string[];
  convenioOptions: string[];
  hospitalOptions: string[];
  procedureOptions: string[];
  medicalUserName: string;
  medicalUsersCount: number;
  conveniosCount: number;
  isMedical: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onApply: () => void;
  onClear: () => void;
  onStartMonthChange: (value: string) => void;
  onEndMonthChange: (value: string) => void;
};

export function BillingFiltersPanel({
  filters,
  setFilters,
  resultCount,
  doctorOptions,
  convenioOptions,
  hospitalOptions,
  procedureOptions,
  medicalUserName,
  medicalUsersCount,
  conveniosCount,
  isMedical,
  isFetching,
  onRefresh,
  onApply,
  onClear,
  onStartMonthChange,
  onEndMonthChange,
}: BillingFiltersPanelProps) {
  return (
    <DataPanel className="billing-filter-panel">
      <details className="billing-filters-accordion">
        <summary className="billing-filters-summary">
          <div><span className="eyebrow">Consulta de faturamento</span><h2>{resultCount} cirurgia(s) encontradas</h2></div>
          <span className="billing-filters-toggle">Filtros</span>
        </summary>
        <div className="billing-filters-content">
          <div className="table-tools billing-toolbar">
            <SearchField
              label="Buscar cirurgia faturada"
              value={filters.search}
              onValueChange={(search) => setFilters((current) => ({ ...current, search }))}
              placeholder="Paciente, procedimento, código, hospital..."
            />
            <IconButton label="Atualizar faturamento médico" title="Atualizar faturamento" onClick={onRefresh} disabled={isFetching}>
              <RefreshCw size={18} />
            </IconButton>
          </div>

          <div className="billing-filter-grid">
            <ComboboxField
              className="filter-field"
              label="Cirurgião"
              value={filters.medico}
              options={doctorOptions}
              onValueChange={(medico) => setFilters((current) => ({ ...current, medico }))}
              disabled={isMedical || !doctorOptions.length}
              placeholder={isMedical ? formatPersonName(medicalUserName) : medicalUsersCount ? 'Todos os cirurgiões' : 'Nenhum médico cadastrado'}
              noOptionsLabel="Nenhum cirurgião encontrado."
            />
            <ComboboxField className="filter-field" label="Convênio" value={filters.convenio} options={convenioOptions} onValueChange={(convenio) => setFilters((current) => ({ ...current, convenio }))} disabled={!conveniosCount && !filters.convenio} placeholder={conveniosCount ? 'Todos os convênios' : 'Nenhum convênio cadastrado'} noOptionsLabel="Nenhum convênio encontrado." />
            <ComboboxField className="filter-field" label="Hospital" value={filters.hospital} options={hospitalOptions} onValueChange={(hospital) => setFilters((current) => ({ ...current, hospital }))} placeholder="Todos os hospitais" noOptionsLabel="Nenhum hospital encontrado." />
            <ComboboxField className="filter-field" label="Procedimento" value={filters.procedimento} options={procedureOptions} onValueChange={(procedimento) => setFilters((current) => ({ ...current, procedimento }))} placeholder="Principal ou associado" noOptionsLabel="Nenhum procedimento encontrado." />
            <SelectField className="filter-field" label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as BillingFilters['status'] }))}>
              {BILLING_STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField className="filter-field" label="Regime" value={filters.regime} onChange={(event) => setFilters((current) => ({ ...current, regime: event.target.value as BillingFilters['regime'] }))}>
              {BILLING_REGIME_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <BillingMonthField id="billing-period-start" label="Competência inicial" value={filters.competenciaInicio} onChange={onStartMonthChange} />
            <BillingMonthField id="billing-period-end" label="Competência final" value={filters.competenciaFinal} onChange={onEndMonthChange} />
            <CheckboxField className="billing-checkbox" label="Mostrar apenas cirurgias com pendências de faturamento" checked={filters.onlyPendingItems} onCheckedChange={(onlyPendingItems) => setFilters((current) => ({ ...current, onlyPendingItems }))} />
            <div className="billing-filter-actions">
              <Button className="billing-apply-filters" variant="primary" onClick={onApply} disabled={isFetching}><Search size={16} />Consultar</Button>
              <Button className="billing-clear-filters" onClick={onClear}>Limpar filtros</Button>
            </div>
          </div>
        </div>
      </details>
    </DataPanel>
  );
}
