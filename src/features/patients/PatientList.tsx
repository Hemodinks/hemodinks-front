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
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Paciente } from '../../types';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
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
  pacienteFilters: PacienteFilters;
  pacienteExportLoading: PacienteExportFormat | null;
  pacienteExportScope: PacienteExportScope;
  sessionToken: string;
  canCreatePatients: boolean;
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
  pacienteFilters,
  pacienteExportLoading,
  pacienteExportScope,
  sessionToken,
  canCreatePatients,
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
  onRefresh,
  onOpenNewPacienteForm,
  onExportPacientes,
  onEditPaciente,
  onDeletePaciente,
  onOpenPacienteFiles,
  onSelectPatientInfo,
}: PatientListProps) {
  return (
    <section className="data-panel">
      <div className="data-header">
        <div>
          <span className="eyebrow">Cadastro de pacientes</span>
          <h2>{pacientesTotalItems} cadastrados</h2>
        </div>

        <div className="table-tools">
          {canCreatePatients && (
            <button type="button" className="ghost-button" onClick={onOpenNewPacienteForm}>
              <Plus size={17} />
              Novo paciente
            </button>
          )}
          <label className="search-box">
            <Search size={17} />
            <input
              type="search"
              value={pacienteSearchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar"
            />
          </label>
          <button
            type="button"
            className="icon-button"
            onClick={onRefresh}
            title="Atualizar lista"
          >
            <RefreshCw size={18} />
          </button>
          <div className="patient-export-actions" aria-label="Exportacoes de pacientes">
            <label className="export-scope-field">
              Exportar
              <select
                value={pacienteExportScope}
                onChange={(event) => onExportScopeChange(event.target.value as PacienteExportScope)}
              >
                <option value="all">Todos os pacientes</option>
                {isAdmin && <option value="doctor">Medico selecionado</option>}
                <option value="visible">Dados da tela</option>
              </select>
            </label>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void onExportPacientes('xlsx')}
              disabled={pacienteExportLoading !== null}
            >
              <Download size={17} />
              {pacienteExportLoading === 'xlsx' ? 'Gerando...' : 'Exportar XLSX'}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void onExportPacientes('pdf')}
              disabled={pacienteExportLoading !== null}
            >
              <FileText size={17} />
              {pacienteExportLoading === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
            </button>
          </div>
          {isAdmin && (
            <div className="patient-filter-grid" aria-label="Filtros administrativos de pacientes">
              <label className="filter-field">
                Medico
                <input
                  type="search"
                  list={MEDICAL_USERS_DATALIST_ID}
                  value={pacienteFilters.medico}
                  onChange={(event) => onFiltersChange((current) => ({ ...current, medico: event.target.value }))}
                  disabled={!hasMedicalUsers}
                  placeholder={hasMedicalUsers ? 'Todos os medicos' : 'Nenhum medico cadastrado'}
                />
              </label>
              <label className="filter-field">
                Convenio
                <input
                  type="search"
                  list={CONVENIOS_DATALIST_ID}
                  value={pacienteFilters.convenio}
                  onChange={(event) => onFiltersChange((current) => ({ ...current, convenio: event.target.value }))}
                  disabled={!hasConvenios}
                  placeholder={hasConvenios ? 'Convenio' : 'Nenhum convenio cadastrado'}
                />
              </label>
              <label className="filter-field">
                Procedimento
                <input
                  type="search"
                  value={pacienteFilters.procedimento}
                  onChange={(event) => onFiltersChange((current) => ({ ...current, procedimento: event.target.value }))}
                  placeholder="Procedimento"
                />
              </label>
              <button
                type="button"
                className="ghost-button patient-clear-filters"
                onClick={onClearFilters}
              >
                <X size={17} />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {pacienteSuccessMessage && <p className="alert success"><CheckCircle2 size={17} />{pacienteSuccessMessage}</p>}
      {pacientesError && <p className="alert error">{pacientesError}</p>}

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
                <th>Paciente</th>
                <th>Info</th>
                <th>Hospital</th>
                <th>Medico</th>
                <th>Convenio</th>
                <th>Status Pago</th>
                <th>Arquivos</th>
                <th aria-label="Acoes" />
              </tr>
            </thead>
            <tbody>
              {pacientesLoading ? (
                <tr>
                  <td colSpan={8} className="empty-row">Carregando pacientes...</td>
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
                    <td data-label="Medico">{paciente.medico || '-'}</td>
                    <td data-label="Convenio">{paciente.convenio || '-'}</td>
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
                        <button type="button" className="icon-button muted" onClick={() => void onEditPaciente(paciente)} title={patientReadOnly ? 'Visualizar' : 'Editar'}>
                          {patientReadOnly ? <Eye size={17} /> : <Pencil size={17} />}
                        </button>
                        {canDeletePatients && (
                          <button type="button" className="icon-button danger" onClick={() => void onDeletePaciente(paciente)} title="Excluir">
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-row">Nenhum paciente encontrado.</td>
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
          <button
            type="button"
            className="icon-button"
            onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            disabled={pacienteCurrentPage === 1}
            title="Pagina anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="page-indicator">Pagina {pacienteCurrentPage} de {pacienteTotalPages}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => onPageChange((page) => Math.min(pacienteTotalPages, page + 1))}
            disabled={pacienteCurrentPage === pacienteTotalPages}
            title="Proxima pagina"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
