import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type { Paciente } from '../../types';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import { AlertMessage, Button, DataPanel, IconButton, SearchField, SelectField, TextField } from '../../shared/components/ui';
import {
  CONVENIOS_DATALIST_ID,
  MEDICAL_USERS_DATALIST_ID,
} from '../../shared/utils/formatters';
import { scrollListCarousel } from '../../shared/utils/carousel';
import { UserAvatar } from '../users/UserAvatar';

type PatientListProps = {
  pacientes: Paciente[];
  pacientesLoading: boolean;
  pacientesError: string;
  pacienteSuccessMessage: string;
  pacientesTotalItems: number;
  pacienteVisibleStart: number;
  pacienteVisibleEnd: number;
  pacienteCurrentPage: number;
  pacienteTotalPages: number;
  pacienteSearchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  pacienteFilters: PacienteFilters;
  pacienteExportLoading: PacienteExportFormat | null;
  pacienteExportScope: PacienteExportScope;
  sessionToken: string;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  patientReadOnly: boolean;
  isAdmin: boolean;
  hasMedicalUsers: boolean;
  hasConvenios: boolean;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: PacienteFilters | ((current: PacienteFilters) => PacienteFilters)) => void;
  onClearFilters: () => void;
  onExportScopeChange: (scope: PacienteExportScope) => void;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onSortChange: (field: string) => void;
  onRefresh: () => void;
  onOpenNewPacienteForm: () => void;
  onExportPacientes: (format: PacienteExportFormat) => void | Promise<void>;
  onEditPaciente: (paciente: Paciente) => void | Promise<void>;
  onDeletePaciente: (paciente: Paciente) => void | Promise<void>;
  onOpenPacienteFiles: (paciente: Paciente) => void | Promise<void>;
  onSelectPatientInfo: (paciente: Paciente) => void;
};

export function PatientList({
  pacientes,
  pacientesLoading,
  pacientesError,
  pacienteSuccessMessage,
  pacientesTotalItems,
  pacienteVisibleStart,
  pacienteVisibleEnd,
  pacienteCurrentPage,
  pacienteTotalPages,
  pacienteSearchTerm,
  sortBy,
  sortDirection,
  pacienteFilters,
  pacienteExportLoading,
  pacienteExportScope,
  sessionToken,
  canCreatePatients,
  canEditPatients,
  canDeletePatients,
  patientReadOnly,
  isAdmin,
  hasMedicalUsers,
  hasConvenios,
  onSearchChange,
  onFiltersChange,
  onClearFilters,
  onExportScopeChange,
  onPageChange,
  onSortChange,
  onRefresh,
  onOpenNewPacienteForm,
  onExportPacientes,
  onEditPaciente,
  onDeletePaciente,
  onOpenPacienteFiles,
  onSelectPatientInfo,
}: PatientListProps) {
  const patientActionLabel = patientReadOnly || !canEditPatients ? 'Visualizar' : 'Editar';

  return (
    <DataPanel>
      <div className="data-header">
        <div>
          <span className="eyebrow">Cadastro de pacientes</span>
          <h2>{pacientesTotalItems} cadastrados</h2>
        </div>

        <div className="table-tools">
          {canCreatePatients && (
            <Button onClick={onOpenNewPacienteForm}>
              <Plus size={17} />
              Novo paciente
            </Button>
          )}
          <SearchField
            label="Buscar pacientes"
            value={pacienteSearchTerm}
            onValueChange={onSearchChange}
          />
          <IconButton label="Atualizar lista de pacientes" onClick={onRefresh} title="Atualizar lista">
            <RefreshCw size={18} />
          </IconButton>
          <div className="patient-export-actions" aria-label="Exportacoes de pacientes">
            <SelectField
              className="export-scope-field"
              label="Exportar"
              value={pacienteExportScope}
              onChange={(event) => onExportScopeChange(event.target.value as PacienteExportScope)}
            >
              <option value="all">Todos os pacientes</option>
              {isAdmin && <option value="doctor">Cirurgiao selecionado</option>}
              <option value="visible">Dados da tela</option>
            </SelectField>
            <Button
              onClick={() => void onExportPacientes('xlsx')}
              disabled={pacienteExportLoading !== null}
            >
              <Download size={17} />
              {pacienteExportLoading === 'xlsx' ? 'Gerando...' : 'Exportar XLSX'}
            </Button>
            <Button
              onClick={() => void onExportPacientes('pdf')}
              disabled={pacienteExportLoading !== null}
            >
              <FileText size={17} />
              {pacienteExportLoading === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
            </Button>
          </div>
          {isAdmin && (
            <div className="patient-filter-grid" aria-label="Filtros administrativos de pacientes">
              <TextField
                className="filter-field"
                label="Cirurgiao"
                type="search"
                list={MEDICAL_USERS_DATALIST_ID}
                value={pacienteFilters.medico}
                onValueChange={(value) => onFiltersChange((current) => ({ ...current, medico: value }))}
                disabled={!hasMedicalUsers}
                placeholder={hasMedicalUsers ? 'Todos os cirurgioes' : 'Nenhum medico cadastrado'}
              />
              <TextField
                className="filter-field"
                label="Convenio"
                type="search"
                list={CONVENIOS_DATALIST_ID}
                value={pacienteFilters.convenio}
                onValueChange={(value) => onFiltersChange((current) => ({ ...current, convenio: value }))}
                disabled={!hasConvenios}
                placeholder={hasConvenios ? 'Convenio' : 'Nenhum convenio cadastrado'}
              />
              <TextField
                className="filter-field"
                label="Procedimento"
                type="search"
                value={pacienteFilters.procedimento}
                onValueChange={(value) => onFiltersChange((current) => ({ ...current, procedimento: value }))}
                placeholder="Procedimento"
              />
              <Button
                className="patient-clear-filters"
                onClick={onClearFilters}
              >
                <X size={17} />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      {pacienteSuccessMessage && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{pacienteSuccessMessage}</AlertMessage>}
      {pacientesError && <AlertMessage type="error">{pacientesError}</AlertMessage>}

      <div className="carousel-shell">
        <button
          type="button"
          className="carousel-nav carousel-nav-left"
          onClick={(event) => scrollListCarousel(event, 'previous')}
          aria-label="Voltar no carrossel de pacientes"
          title="Voltar no carrossel"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="table-wrap list-carousel-wrap patients-carousel-wrap">
          <table className="patients-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('nome')} aria-sort={sortBy === 'nome' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Paciente
                    {sortBy === 'nome' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>Info</th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('hospital')} aria-sort={sortBy === 'hospital' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Hospital
                    {sortBy === 'hospital' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('medico')} aria-sort={sortBy === 'medico' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Cirurgiao
                    {sortBy === 'medico' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('auxiliares')} aria-sort={sortBy === 'auxiliares' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Auxiliares
                    {sortBy === 'auxiliares' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('convenio')} aria-sort={sortBy === 'convenio' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Convenio
                    {sortBy === 'convenio' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('status')} aria-sort={sortBy === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Status Pago
                    {sortBy === 'status' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('arquivos')} aria-sort={sortBy === 'arquivos' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Arquivos
                    {sortBy === 'arquivos' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th aria-label="Acoes" />
              </tr>
            </thead>
            <tbody>
              {pacientesLoading ? (
                <tr>
                  <td colSpan={9} className="empty-row">Carregando pacientes...</td>
                </tr>
              ) : pacientes.length ? (
                pacientes.map((paciente) => (
                  <tr key={paciente.id}>
                    <td data-label="Paciente">
                      <div className="name-cell">
                        <UserAvatar userId={paciente.userId} name={paciente.nomePaciente} photo={paciente.fotoPerfil} authToken={sessionToken} size="sm" />
                        <span>{paciente.nomePaciente}</span>
                      </div>
                    </td>
                    <td data-label="Info">
                      <button
                        type="button"
                        className="status-info-button"
                        title="Ver informacoes adicionais"
                        aria-label={`Informacoes adicionais de ${paciente.nomePaciente}`}
                        onClick={() => onSelectPatientInfo(paciente)}
                      >
                        <Info size={18} />
                      </button>
                    </td>
                    <td data-label="Hospital">{paciente.hospital || '-'}</td>
                    <td data-label="Cirurgiao">{paciente.medico || '-'}</td>
                    {/* <td data-label="Auxiliares">
                      {[paciente.medicoAuxiliar1, paciente.medicoAuxiliar2].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td data-label="Convenio">{paciente.convenio || '-'}</td> */}
                    <td data-label="Status Pago">
                      <span className={`status-pill ${paciente.statusPago ? 'ok' : 'warning'}`}>
                        {paciente.statusPago ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td data-label="Arquivos">
                      {(paciente.arquivosCount ?? paciente.arquivos.length) > 0 ? (
                        <button
                          type="button"
                          className="attachment-count attachment-button"
                          onClick={() => void onOpenPacienteFiles(paciente)}
                          title="Ver arquivos anexos"
                          aria-label={`Arquivos anexos de ${paciente.nomePaciente}`}
                        >
                          <FileText size={15} />
                          {paciente.arquivosCount ?? paciente.arquivos.length}
                        </button>
                      ) : (
                        <span className="attachment-count">
                          <FileText size={15} />
                          0
                        </span>
                      )}
                    </td>
                    <td data-label="Acoes">
                      <div className="row-actions">
                        <IconButton
                          label={`${patientActionLabel} ${paciente.nomePaciente}`}
                          tone="muted"
                          onClick={() => void onEditPaciente(paciente)}
                          title={patientActionLabel}
                        >
                          {patientReadOnly || !canEditPatients ? <Eye size={17} /> : <Pencil size={17} />}
                        </IconButton>
                        {canDeletePatients && (
                          <IconButton
                            label={`Excluir ${paciente.nomePaciente}`}
                            tone="danger"
                            onClick={() => void onDeletePaciente(paciente)}
                            title="Excluir"
                          >
                            <Trash2 size={17} />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="empty-row">Nenhum paciente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="carousel-nav carousel-nav-right"
          onClick={(event) => scrollListCarousel(event, 'next')}
          aria-label="Avancar no carrossel de pacientes"
          title="Avancar no carrossel"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="pagination-bar">
        <span>
          {pacienteVisibleStart}-{pacienteVisibleEnd} de {pacientesTotalItems}
        </span>
        <div className="pagination-actions">
          <IconButton
            label="Pagina anterior de pacientes"
            onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            disabled={pacienteCurrentPage === 1}
            title="Pagina anterior"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span className="page-indicator">Pagina {pacienteCurrentPage} de {pacienteTotalPages}</span>
          <IconButton
            label="Proxima pagina de pacientes"
            onClick={() => onPageChange((page) => Math.min(pacienteTotalPages, page + 1))}
            disabled={pacienteCurrentPage === pacienteTotalPages}
            title="Proxima pagina"
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>
    </DataPanel>
  );
}
