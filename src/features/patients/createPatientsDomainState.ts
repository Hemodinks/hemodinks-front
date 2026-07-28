import type { useCbhpmLookup } from './useCbhpmLookup';
import type { usePatientCommands } from './usePatientCommands';
import type { usePatientDomainActions } from './usePatientDomainActions';
import type { usePatientExport } from './usePatientExport';
import type { usePatientFiles } from './usePatientFiles';
import type { usePatientForm } from './usePatientForm';
import type { usePatientList } from './usePatientList';
import type { usePatientObservacoes } from './usePatientObservacoes';
import type { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { CBHPM_PAGE_SIZE, PAGE_SIZE } from '../../shared/utils/formatters';

type CreatePatientsDomainStateOptions = {
  patientList: ReturnType<typeof usePatientList>;
  patientForm: ReturnType<typeof usePatientForm>;
  cbhpmLookup: ReturnType<typeof useCbhpmLookup>;
  queries: ReturnType<typeof usePatientsDomainQueries>;
  patientExport: ReturnType<typeof usePatientExport>;
  patientObservacoes: ReturnType<typeof usePatientObservacoes>;
  patientFiles: ReturnType<typeof usePatientFiles>;
  patientCommands: ReturnType<typeof usePatientCommands>;
  patientActions: ReturnType<typeof usePatientDomainActions>;
  canConsultCbhpm: boolean;
  resetPatientsState: () => void;
};

export function createPatientsDomainState({
  patientList,
  patientForm,
  cbhpmLookup,
  queries,
  patientExport,
  patientObservacoes,
  patientFiles,
  patientCommands,
  patientActions,
  canConsultCbhpm,
  resetPatientsState,
}: CreatePatientsDomainStateOptions) {
  const pacienteTotalPages = Math.max(1, queries.pacientesTotalPages);
  const pacientePageStart = (patientList.pacienteCurrentPage - 1) * PAGE_SIZE;
  const cbhpmTotalPageCount = Math.max(1, queries.cbhpmTotalPages);
  const cbhpmPageStart = (cbhpmLookup.cbhpmCurrentPage - 1) * CBHPM_PAGE_SIZE;

  return {
    pacientes: queries.pacientes,
    pacientesLoading: queries.pacientesLoading,
    pacientesError: patientList.pacientesError || queries.pacientesError,
    pacienteSuccessMessage: patientList.pacienteSuccessMessage,
    pacienteSearchTerm: patientList.pacienteSearchTerm,
    setPacienteSearchTerm: patientList.setPacienteSearchTerm,
    pacienteExportLoading: patientExport.pacienteExportLoading,
    pacienteExportScope: patientExport.pacienteExportScope,
    setPacienteExportScope: patientExport.setPacienteExportScope,
    pacienteFilters: patientList.pacienteFilters,
    setPacienteFilters: patientList.setPacienteFilters,
    debouncedPacienteSearchTerm: patientList.debouncedPacienteSearchTerm,
    debouncedPacienteFilters: patientList.debouncedPacienteFilters,
    pacienteCurrentPage: patientList.pacienteCurrentPage,
    setPacienteCurrentPage: patientList.setPacienteCurrentPage,
    sortBy: patientList.sortBy,
    setSortBy: patientList.setSortBy,
    sortDirection: patientList.sortDirection,
    setSortDirection: patientList.setSortDirection,
    pacientesTotalItems: queries.pacientesTotalItems,
    pacientesTotalPages: queries.pacientesTotalPages,
    pacienteTotalPages,
    paginatedPacientes: queries.pacientes,
    pacienteVisibleStart: queries.pacientesTotalItems ? pacientePageStart + 1 : 0,
    pacienteVisibleEnd: Math.min(pacientePageStart + PAGE_SIZE, queries.pacientesTotalItems),
    pacienteFormData: patientForm.pacienteFormData,
    setPacienteFormData: patientForm.setPacienteFormData,
    editingPacienteId: patientForm.editingPacienteId,
    editingPaciente: patientForm.editingPaciente,
    pacienteFormError: patientForm.pacienteFormError,
    pacienteFormLoading: patientCommands.formLoading,
    pendingPatientFiles: patientForm.pendingPatientFiles,
    patientFileInputKey: patientForm.patientFileInputKey,
    selectedPatientInfo: patientFiles.selectedPatientInfo,
    setSelectedPatientInfo: patientFiles.setSelectedPatientInfo,
    selectedPatientFiles: patientFiles.selectedPatientFiles,
    patientFilesModalLoading: patientFiles.patientFilesModalLoading,
    patientFilesModalError: patientFiles.patientFilesModalError,
    selectedPatientObservacoes: patientObservacoes.selectedPatientObservacoes,
    patientObservacoes: patientObservacoes.patientObservacoes,
    patientObservacoesLoading: patientObservacoes.patientObservacoesLoading,
    patientObservacoesSaving: patientObservacoes.patientObservacoesSaving,
    patientObservacoesError: patientObservacoes.patientObservacoesError,
    patientObservationDraft: patientObservacoes.patientObservationDraft,
    setPatientObservationDraft: patientObservacoes.setPatientObservationDraft,
    patientObservationReplyTo: patientObservacoes.patientObservationReplyTo,
    setPatientObservationReplyTo: patientObservacoes.setPatientObservationReplyTo,
    medicalUsers: queries.medicalUsers,
    hospitais: queries.hospitais,
    hospitaisError: queries.hospitaisError,
    convenios: queries.convenios,
    conveniosError: queries.conveniosError,
    opmeFornecedores: queries.opmeFornecedores,
    opmeFornecedoresError: queries.opmeFornecedoresError,
    cbhpmModalOpen: cbhpmLookup.cbhpmModalOpen,
    setCbhpmModalOpen: cbhpmLookup.setCbhpmModalOpen,
    cbhpmItems: queries.cbhpmItems,
    cbhpmFilters: cbhpmLookup.cbhpmFilters,
    setCbhpmFilters: cbhpmLookup.setCbhpmFilters,
    cbhpmFilterHint: queries.cbhpmFilterHint,
    canConsultCbhpm,
    canSearchCbhpm: queries.canSearchCbhpm,
    cbhpmLoading: queries.cbhpmLoading,
    cbhpmError: queries.cbhpmError,
    cbhpmCurrentPage: cbhpmLookup.cbhpmCurrentPage,
    setCbhpmCurrentPage: cbhpmLookup.setCbhpmCurrentPage,
    cbhpmSortBy: cbhpmLookup.sortBy,
    setCbhpmSortBy: cbhpmLookup.setSortBy,
    cbhpmSortDirection: cbhpmLookup.sortDirection,
    setCbhpmSortDirection: cbhpmLookup.setSortDirection,
    cbhpmTotalPageCount,
    cbhpmTotalItems: queries.cbhpmTotalItems,
    cbhpmVisibleStart: queries.cbhpmTotalItems ? cbhpmPageStart + 1 : 0,
    cbhpmVisibleEnd: Math.min(cbhpmPageStart + CBHPM_PAGE_SIZE, queries.cbhpmTotalItems),
    loadMedicalUsers: queries.loadMedicalUsers,
    loadPacientes: queries.loadPacientes,
    loadHospitais: queries.loadHospitais,
    loadConvenios: queries.loadConvenios,
    loadOpmeFornecedores: queries.loadOpmeFornecedores,
    loadCbhpm: queries.loadCbhpm,
    resetPatientsState,
    resetPacienteForm: patientForm.resetPacienteForm,
    handleEditPaciente: patientCommands.handleEditPaciente,
    handlePacienteFilesChange: patientFiles.handleFilesChange,
    removePendingPatientFile: patientFiles.removePendingFile,
    handleSubmitPaciente: patientCommands.handleSubmitPaciente,
    handleDeletePaciente: patientCommands.handleDeletePaciente,
    handleDeletePacienteArquivo: patientFiles.deleteFile,
    handleOpenPacienteFiles: patientFiles.openFiles,
    handleOpenPacienteObservacoes: patientObservacoes.handleOpenPacienteObservacoes,
    handleOpenPacienteObservacoesById: patientObservacoes.handleOpenPacienteObservacoesById,
    handleSubmitPacienteObservacao: patientObservacoes.handleSubmitPacienteObservacao,
    handleOpenCbhpmModal: patientActions.handleOpenCbhpmModal,
    handleSelectCbhpm: patientActions.handleSelectCbhpm,
    handleRemovePacienteProcedimento: patientActions.handleRemovePacienteProcedimento,
    handleExportPacientes: patientExport.handleExportPacientes,
    openPatientsList: patientActions.openPatientsList,
    openNewPacienteForm: patientActions.openNewPacienteForm,
    closePacienteForm: patientActions.closePacienteForm,
    clearPacienteFilters: patientActions.clearPacienteFilters,
    refreshPacientes: patientActions.refreshPacientes,
    refreshCbhpm: patientActions.refreshCbhpm,
    closePatientFilesModal: patientFiles.closeFilesModal,
    closePatientObservacoesModal: patientObservacoes.closePatientObservacoesModal,
  };
}
