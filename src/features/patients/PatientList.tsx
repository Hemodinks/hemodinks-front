import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Info,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import type { Paciente } from './patientTypes';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import {
  AlertMessage,
  Button,
  DataPanel,
  IconButton,
  SearchField,
  SelectField,
  TextField,
} from '../../shared/components/ui';
import { CONVENIOS_DATALIST_ID, MEDICAL_USERS_DATALIST_ID } from '../../shared/utils/formatters';
import { UserAvatar } from '../../shared/components/UserAvatar';
import {
  HorizontalTableScroller,
  ListToolbar,
  Pagination,
  SortableHeader,
  TableStateRow,
} from '../../shared/components/listing';

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
  canManageObservacoes: boolean;
  patientReadOnly: boolean;
  isAdmin: boolean;
  hasMedicalUsers: boolean;
  hasConvenios: boolean;
  onSearchChange: (value: string) => void;
  onFiltersChange: (
    filters: PacienteFilters | ((current: PacienteFilters) => PacienteFilters),
  ) => void;
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
  onOpenPacienteObservacoes: (paciente: Paciente) => void | Promise<void>;
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
  canManageObservacoes,
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
  onOpenPacienteObservacoes,
  onSelectPatientInfo,
}: PatientListProps) {
  const patientActionLabel = patientReadOnly || !canEditPatients ? 'Visualizar' : 'Editar';

  return (
    <DataPanel>
      <ListToolbar eyebrow="Cadastro de pacientes" title={`${pacientesTotalItems} cadastrados`}>
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
        <IconButton
          label="Atualizar lista de pacientes"
          onClick={onRefresh}
          title="Atualizar lista"
        >
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
            {isAdmin && <option value="doctor">Cirurgião selecionado</option>}
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
              label="Cirurgião"
              type="search"
              list={MEDICAL_USERS_DATALIST_ID}
              value={pacienteFilters.medico}
              onValueChange={(value) =>
                onFiltersChange((current) => ({ ...current, medico: value }))
              }
              disabled={!hasMedicalUsers}
              placeholder={hasMedicalUsers ? 'Todos os cirurgiões' : 'Nenhum médico cadastrado'}
            />
            <TextField
              className="filter-field"
              label="Convênio"
              type="search"
              list={CONVENIOS_DATALIST_ID}
              value={pacienteFilters.convenio}
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
              value={pacienteFilters.procedimento}
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

      {pacienteSuccessMessage && (
        <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>
          {pacienteSuccessMessage}
        </AlertMessage>
      )}
      {pacientesError && <AlertMessage type="error">{pacientesError}</AlertMessage>}

      <HorizontalTableScroller entityLabel="pacientes" className="patients-carousel-wrap">
        <table className="patients-table">
          <thead>
            <tr>
              <SortableHeader
                field="nome"
                label="Paciente"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
              />
              <th>Info</th>
              <SortableHeader
                field="medico"
                label="Cirurgião"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
              />
              <SortableHeader
                field="status"
                label="Status Pago"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
              />
              <SortableHeader
                field="arquivos"
                label="Arquivos"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
              />
              <th>Obs.</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {pacientesLoading || !pacientes.length ? (
              <TableStateRow
                colSpan={7}
                loading={pacientesLoading}
                empty={!pacientes.length}
                loadingLabel="Carregando pacientes..."
                emptyLabel="Nenhum paciente encontrado."
              />
            ) : (
              pacientes.map((paciente) => {
                const unreadObservations = paciente.observacoesNaoLidasCount ?? 0;
                const hasUnreadObservations = unreadObservations > 0;

                return (
                  <tr key={paciente.id}>
                    <td data-label="Paciente">
                      <div className="name-cell">
                        <UserAvatar
                          userId={paciente.userId}
                          name={paciente.nomePaciente}
                          photo={paciente.fotoPerfil}
                          authToken={sessionToken}
                          size="sm"
                        />
                        <span>{paciente.nomePaciente}</span>
                      </div>
                    </td>
                    <td data-label="Info">
                      <button
                        type="button"
                        className="status-info-button"
                        title="Ver informações adicionais"
                        aria-label={`Informações adicionais de ${paciente.nomePaciente}`}
                        onClick={() => onSelectPatientInfo(paciente)}
                      >
                        <Info size={18} />
                      </button>
                    </td>
                    <td data-label="Cirurgião">{paciente.medico || '-'}</td>
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
                          <FileText size={15} />0
                        </span>
                      )}
                    </td>
                    <td data-label="Observações">
                      {canManageObservacoes && !patientReadOnly ? (
                        <button
                          type="button"
                          className={`patient-observation-button${hasUnreadObservations ? ' has-unread-observations' : ''}`}
                          onClick={() => void onOpenPacienteObservacoes(paciente)}
                          title="Abrir observações"
                          aria-label={`Observações de ${paciente.nomePaciente}`}
                        >
                          <MessageSquareText size={16} />
                          <span className="patient-observation-count">{unreadObservations}</span>
                        </button>
                      ) : (
                        <span
                          className={`attachment-count patient-observation-count${hasUnreadObservations ? ' has-unread-observations' : ''}`}
                        >
                          <MessageSquareText size={15} />
                          {unreadObservations}
                        </span>
                      )}
                    </td>
                    <td data-label="Ações">
                      <div className="row-actions">
                        <IconButton
                          label={`${patientActionLabel} ${paciente.nomePaciente}`}
                          tone="muted"
                          onClick={() => void onEditPaciente(paciente)}
                          title={patientActionLabel}
                        >
                          {patientReadOnly || !canEditPatients ? (
                            <Eye size={17} />
                          ) : (
                            <Pencil size={17} />
                          )}
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
                );
              })
            )}
          </tbody>
        </table>
      </HorizontalTableScroller>

      <Pagination
        entityLabel="pacientes"
        visibleStart={pacienteVisibleStart}
        visibleEnd={pacienteVisibleEnd}
        totalItems={pacientesTotalItems}
        currentPage={pacienteCurrentPage}
        totalPages={pacienteTotalPages}
        onPageChange={onPageChange}
      />
    </DataPanel>
  );
}
