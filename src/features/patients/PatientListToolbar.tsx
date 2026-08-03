import { Download, FileText, Plus, RefreshCw, X } from 'lucide-react';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import {
  Button,
  IconButton,
  SearchField,
  SelectField,
  TextField,
} from '../../shared/components/ui';
import { ListToolbar } from '../../shared/components/listing';
import { CONVENIOS_DATALIST_ID, MEDICAL_USERS_DATALIST_ID } from '../../shared/utils/formatters';

type PatientListToolbarProps = {
  totalItems: number;
  canCreatePatients: boolean;
  searchTerm: string;
  exportLoading: PacienteExportFormat | null;
  exportScope: PacienteExportScope;
  isAdmin: boolean;
  filters: PacienteFilters;
  hasMedicalUsers: boolean;
  hasConvenios: boolean;
  onOpenNew: () => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onExportScopeChange: (scope: PacienteExportScope) => void;
  onExport: (format: PacienteExportFormat) => void | Promise<void>;
  onFiltersChange: (
    filters: PacienteFilters | ((current: PacienteFilters) => PacienteFilters),
  ) => void;
  onClearFilters: () => void;
};

export function PatientListToolbar({
  totalItems,
  canCreatePatients,
  searchTerm,
  exportLoading,
  exportScope,
  isAdmin,
  filters,
  hasMedicalUsers,
  hasConvenios,
  onOpenNew,
  onSearchChange,
  onRefresh,
  onExportScopeChange,
  onExport,
  onFiltersChange,
  onClearFilters,
}: PatientListToolbarProps) {
  return (
    <ListToolbar eyebrow="Cadastro de pacientes" title={`${totalItems} cadastrados`}>
      {canCreatePatients && (
        <Button onClick={onOpenNew}>
          <Plus size={17} />
          Novo paciente
        </Button>
      )}
      <SearchField label="Buscar pacientes" value={searchTerm} onValueChange={onSearchChange} />
      <IconButton label="Atualizar lista de pacientes" onClick={onRefresh} title="Atualizar lista">
        <RefreshCw size={18} />
      </IconButton>
      <div className="patient-export-actions" aria-label="Exportacoes de pacientes">
        <SelectField
          className="export-scope-field"
          label="Exportar"
          value={exportScope}
          onChange={(event) => onExportScopeChange(event.target.value as PacienteExportScope)}
        >
          <option value="all">Todos os pacientes</option>
          {isAdmin && <option value="doctor">Cirurgião selecionado</option>}
          <option value="visible">Dados da tela</option>
        </SelectField>
        <Button onClick={() => void onExport('xlsx')} disabled={exportLoading !== null}>
          <Download size={17} />
          {exportLoading === 'xlsx' ? 'Gerando...' : 'Exportar XLSX'}
        </Button>
        <Button onClick={() => void onExport('pdf')} disabled={exportLoading !== null}>
          <FileText size={17} />
          {exportLoading === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
        </Button>
      </div>
      {isAdmin && (
        <div className="patient-filter-grid" aria-label="Filtros administrativos de pacientes">
          <TextField
            className="filter-field"
            label="Cirurgião"
            type="search"
            list={MEDICAL_USERS_DATALIST_ID}
            value={filters.medico}
            onValueChange={(value) => onFiltersChange((current) => ({ ...current, medico: value }))}
            disabled={!hasMedicalUsers}
            placeholder={hasMedicalUsers ? 'Todos os cirurgiões' : 'Nenhum médico cadastrado'}
          />
          <TextField
            className="filter-field"
            label="Convênio"
            type="search"
            list={CONVENIOS_DATALIST_ID}
            value={filters.convenio}
            onValueChange={(value) =>
              onFiltersChange((current) => ({ ...current, convenio: value }))
            }
            disabled={!hasConvenios}
            placeholder={hasConvenios ? 'Convênio' : 'Nenhum convênio cadastrado'}
          />
          <TextField
            className="filter-field"
            label="Procedimento"
            type="search"
            value={filters.procedimento}
            onValueChange={(value) =>
              onFiltersChange((current) => ({ ...current, procedimento: value }))
            }
            placeholder="Procedimento"
          />
          <Button className="patient-clear-filters" onClick={onClearFilters}>
            <X size={17} />
            Limpar filtros
          </Button>
        </div>
      )}
    </ListToolbar>
  );
}
