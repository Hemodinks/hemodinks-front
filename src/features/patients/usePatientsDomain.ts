import { useState } from 'react';
import type { Paciente } from '../../types';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import { emptyPacienteFilters } from './patientUtils';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { usePatientExport } from './usePatientExport';
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';
import { usePatientObservacoes } from './usePatientObservacoes';
import type { UsePatientsDomainOptions } from './patientsDomainTypes';
import { usePatientFileActions } from './usePatientFileActions';
import { usePatientProcedureActions } from './usePatientProcedureActions';
import { usePatientPaginationGuards } from './usePatientPaginationGuards';
import { usePatientCrudActions } from './usePatientCrudActions';
import { useFormRouteSync, useRecordLoadError } from '../../shared/hooks/useFormRouteSync';

export function usePatientsDomain({
  session,
  activeView,
  moduleMode,
  companyName,
  isAdmin,
  isMedical,
  canAccessPatients,
  canCreatePatients,
  canEditPatients,
  canDeletePatients,
  canConsultCbhpm,
  patientReadOnly,
  formRecordId,
  navigateToForm,
  navigateToView,
  loadDashboardSummary,
  confirmAction,
}: UsePatientsDomainOptions) {
  const patientList = usePatientList();
  const patientForm = usePatientForm(patientList.pacientes);
  const patientLookups = usePatientLookups();
  const cbhpmLookup = useCbhpmLookup();
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<Paciente | null>(null);
  const [recordLoadError, setRecordLoadError] = useRecordLoadError(activeView === 'patients');

  const {
    pacientes,
    setPacientes,
    pacientesLoading,
    pacientesError,
    setPacientesError,
    pacienteSuccessMessage,
    setPacienteSuccessMessage,
    pacienteSearchTerm,
    setPacienteSearchTerm,
    pacienteFilters,
    setPacienteFilters,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    setDebouncedPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    pacientesTotalItems,
    pacientesTotalPages,
    pacienteTotalPages,
    paginatedPacientes,
    pacienteVisibleStart,
    pacienteVisibleEnd,
    resetPatientListState,
  } = patientList;
  const {
    pacienteFormData,
    setPacienteFormData,
    editingPacienteId,
    setEditingPacienteDetails,
    editingPaciente,
    pacienteFormLoading,
    setPacienteFormLoading,
    pacienteFormError,
    setPacienteFormError,
    patientFileInputKey,
    pendingPatientFiles,
    setPendingPatientFiles,
    resetPacienteForm,
    applyPacienteToForm,
  } = patientForm;
  const {
    medicalUsers,
    hospitais,
    hospitaisError,
    convenios,
    conveniosError,
    opmeFornecedores,
    opmeFornecedoresError,
    resetPatientLookups,
  } = patientLookups;
  const {
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    applyCbhpmFiltersNow,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    sortBy: cbhpmSortBy,
    setSortBy: setCbhpmSortBy,
    sortDirection: cbhpmSortDirection,
    setSortDirection: setCbhpmSortDirection,
    cbhpmTotalItems,
    cbhpmTotalPageCount,
    cbhpmLoading,
    cbhpmError,
    setCbhpmError,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    resetCbhpmLookup,
  } = cbhpmLookup;

  const {
    cbhpmFilterHint,
    canSearchCbhpm,
    loadMedicalUsers,
    loadPacientes,
    loadCbhpm,
    loadHospitais,
    loadConvenios,
    loadOpmeFornecedores,
  } = usePatientsDomainQueries({
    session,
    activeView,
    moduleMode,
    canAccessPatients,
    canConsultCbhpm,
    patientReadOnly,
    patientList,
    patientLookups,
    cbhpmLookup,
  });
  const patientExport = usePatientExport({
    session,
    companyName,
    paginatedPacientes,
    pacienteFilters,
    sortBy,
    sortDirection,
    setPacientesError,
  });
  const patientFileActions = usePatientFileActions({
    session,
    readOnly: patientReadOnly,
    setFormError: setPacienteFormError,
    setPendingFiles: setPendingPatientFiles,
  });
  const {
    selectedPatientFiles,
    setSelectedPatientFiles,
    patientFilesModalLoading,
    setPatientFilesModalLoading,
    patientFilesModalError,
    setPatientFilesModalError,
    handlePacienteFilesChange,
    removePendingPatientFile,
    handleOpenPacienteFiles,
    closePatientFilesModal,
  } = patientFileActions;

  const patientObservacoesState = usePatientObservacoes({
    session,
    activeView,
    moduleMode,
    pacientes,
    editingPaciente,
    setPacientes,
    setEditingPacienteDetails,
    loadPacientes,
    loadDashboardSummary,
  });
  const patientProcedureActions = usePatientProcedureActions({
    readOnly: patientReadOnly,
    canEdit: canEditPatients,
    setFormData: setPacienteFormData,
    setFormError: setPacienteFormError,
    setModalOpen: setCbhpmModalOpen,
    setLookupError: setCbhpmError,
  });
  usePatientPaginationGuards({
    isAdmin,
    currentPage: pacienteCurrentPage,
    totalPages: pacienteTotalPages,
    cbhpmCurrentPage,
    cbhpmTotalPages: cbhpmTotalPageCount,
    setFilters: setPacienteFilters,
    setDebouncedFilters: setDebouncedPacienteFilters,
    setCurrentPage: setPacienteCurrentPage,
    setCbhpmCurrentPage,
  });
  const patientCrudActions = usePatientCrudActions({
    session,
    canCreatePatients,
    canEditPatients,
    canDeletePatients,
    patientList,
    patientForm,
    patientLookups,
    navigateToPatientForm: (recordId) => navigateToForm('patients', recordId),
    navigateToPatients: (replace) => navigateToView('patients', replace),
    onRecordLoadError: setRecordLoadError,
    loadPacientes,
    loadDashboardSummary,
    confirmAction,
  });

  const resetPatientsState = () => {
    resetPatientListState();
    resetPatientLookups();
    setSelectedPatientInfo(null);
    setSelectedPatientFiles(null);
    patientObservacoesState.resetPatientObservacoesState();
    setPatientFilesModalError('');
    setPatientFilesModalLoading(false);
    resetCbhpmLookup();
    resetPacienteForm();
  };

  const openPatientsList = () => {
    if (!canAccessPatients) {
      return;
    }

    navigateToView('patients');
  };

  const openNewPacienteForm = () => {
    if (!canCreatePatients) {
      return;
    }
    navigateToForm('patients', null);
  };

  // Opened by the /pacientes/novo route (click, back/forward, reload or shared link).
  const initNewPacienteForm = () => {
    if (!canCreatePatients) {
      navigateToView('patients', true);
      return;
    }

    resetPacienteForm();
    if (isMedical && session) {
      setPacienteFormData((current) => ({
        ...current,
        medicoUserId: session.user.id,
        medico: session.user.nome,
      }));
    }
    setPacienteSuccessMessage('');

    if (session) {
      void loadMedicalUsers(session.token);
    }

    if (session && !hospitais.length) {
      void loadHospitais(session.token);
    }

    if (session && !opmeFornecedores.length) {
      void loadOpmeFornecedores(session.token);
    }
  };

  const closePacienteForm = () => {
    resetPacienteForm();
    navigateToView('patients');
  };

  useFormRouteSync({
    active: Boolean(session && !session.user.precisaTrocarSenha && canAccessPatients)
      && activeView === 'patients' && moduleMode === 'form',
    recordId: formRecordId,
    openNew: initNewPacienteForm,
    openRecord: patientCrudActions.loadPacienteForEdit,
    onLeave: () => setPacienteFormLoading(false),
  });

  const clearPacienteFilters = () => {
    setPacienteFilters(emptyPacienteFilters);
  };

  // Banner de pendências: abre a lista já filtrada, sem esperar o debounce.
  const openPatientsWithConsolidationPending = () => {
    if (!canAccessPatients) return;
    const pendingFilters = { ...emptyPacienteFilters, pendenciaDataConsolidacao: true };
    setPacienteFilters(pendingFilters);
    setDebouncedPacienteFilters(pendingFilters);
    setPacienteCurrentPage(1);
    openPatientsList();
  };

  const refreshPacientes = () => {
    if (session) {
      void loadPacientes(session.token, true);
    }
  };

  const refreshCbhpm = () => {
    applyCbhpmFiltersNow();

    if (!session || !canSearchCbhpm || !canConsultCbhpm) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.cbhpmRoot(session.token) });
  };

  return {
    ...patientList,
    pacientesError: pacientesError || recordLoadError,
    ...patientForm,
    ...patientLookups,
    ...cbhpmLookup,
    ...patientExport,
    ...patientObservacoesState,
    // Preserve the public list aliases after spreading the CBHPM state,
    // which also owns fields named sortBy and sortDirection.
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    cbhpmSortBy,
    setCbhpmSortBy,
    cbhpmSortDirection,
    setCbhpmSortDirection,
    selectedPatientInfo,
    setSelectedPatientInfo,
    selectedPatientFiles,
    patientFilesModalLoading,
    patientFilesModalError,
    cbhpmFilterHint,
    canConsultCbhpm,
    canSearchCbhpm,
    loadMedicalUsers,
    loadPacientes,
    loadHospitais,
    loadConvenios,
    loadOpmeFornecedores,
    loadCbhpm,
    resetPatientsState,
    resetPacienteForm,
    ...patientCrudActions,
    handlePacienteFilesChange,
    removePendingPatientFile,
    handleOpenPacienteFiles,
    ...patientProcedureActions,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    openPatientsWithConsolidationPending,
    refreshPacientes,
    refreshCbhpm,
    closePatientFilesModal,
  };
}

export type PatientsDomainState = ReturnType<typeof usePatientsDomain>;
