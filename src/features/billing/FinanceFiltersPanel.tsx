import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button, DataPanel, SelectField, TextField } from '../../shared/components/ui';
import type { Convenio, MedicalUserOption, Paciente } from '../../shared/domain/clinicalContracts';
import type { FinanceFiltersState } from './billingPageTypes';
import { formatPersonName } from '../../shared/utils/formatters';

type FinanceFiltersPanelProps = {
  filters: FinanceFiltersState;
  convenios: Convenio[];
  medicalUsers: MedicalUserOption[];
  pacientes: Paciente[];
  loading: boolean;
  setFilters: Dispatch<SetStateAction<FinanceFiltersState>>;
  onApplyFilters: (page: number) => void;
};

export function FinanceFiltersPanel({
  filters,
  convenios,
  medicalUsers,
  pacientes,
  loading,
  setFilters,
  onApplyFilters,
}: FinanceFiltersPanelProps) {
  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    onApplyFilters(1);
  };

  return (
    <DataPanel>
      <details className="billing-filters-accordion">
        <summary className="billing-filters-summary">
          <div>
            <span className="eyebrow">Pesquisa</span>
            <h2>Filtros financeiros</h2>
          </div>
          <span className="billing-filters-toggle">Filtros</span>
        </summary>
        <div className="billing-filters-content">
          <form className="billing-filter-grid" onSubmit={submitFilters}>
            <TextField
              label="Buscar por documento ou paciente"
              placeholder="Ex.: FAT-1-01 ou nome do paciente"
              value={filters.termo}
              onValueChange={(termo) => setFilters((current) => ({ ...current, termo }))}
            />
            <TextField
              label="Competência"
              type="month"
              value={filters.competencia}
              onValueChange={(competencia) =>
                setFilters((current) => ({ ...current, competencia }))
              }
            />
            <TextField
              label="Vencimento inicial"
              type="date"
              value={filters.vencimentoInicio}
              onValueChange={(vencimentoInicio) =>
                setFilters((current) => ({ ...current, vencimentoInicio }))
              }
            />
            <TextField
              label="Vencimento final"
              type="date"
              value={filters.vencimentoFim}
              onValueChange={(vencimentoFim) =>
                setFilters((current) => ({ ...current, vencimentoFim }))
              }
            />
            <SelectField
              label="Convênio"
              value={filters.convenioId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, convenioId: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {convenios.map((item) => (
                <option key={item.idConvenio} value={item.idConvenio}>
                  {item.descricaoConvenio}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Médico"
              value={filters.medicoId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, medicoId: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {medicalUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatPersonName(item.nome)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Paciente"
              value={filters.pacienteId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, pacienteId: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {pacientes.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatPersonName(item.nomePaciente)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="">Todos</option>
              {[
                'Previsto',
                'Aberto',
                'ParcialmenteRecebido',
                'Recebido',
                'Vencido',
                'Cancelado',
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </SelectField>
            <Button variant="primary" type="submit" disabled={loading}>
              <SlidersHorizontal size={16} />
              Aplicar filtros
            </Button>
          </form>
        </div>
      </details>
    </DataPanel>
  );
}
