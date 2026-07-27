import { type Dispatch, type SetStateAction, useEffect } from 'react';
import type {
  AppView,
  ModuleMode,
} from '../../appTypes';
import { queryClient } from '../../queryClient';
import type {
  AuthSession,
  CbhpmGeral,
} from '../../types';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { queryKeys } from '../../shared/queryKeys';
import {
  emptyPacienteFilters,
  normalizePacienteProcedimentos,
  withPrimaryProcedimento,
} from './patientUtils';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { usePatientExport } from './usePatientExport';
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';
import { usePatientObservacoes } from './usePatientObservacoes';
import { usePatientFiles } from './usePatientFiles';
import { usePatientCommands } from './usePatientCommands';

type UsePatientsDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  companyName: string;
  isAdmin: boolean;
  isMedical: boolean;
  canAccessPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canConsultCbhpm: boolean;
  patientReadOnly: boolean;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  confirmAction: ConfirmAction;
};

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
  setModuleMode,
  navigateToView,
  loadDashboardSummary,
  confirmAction,
}: UsePatientsDomainOptions) {
  const patientList = usePatientList();
  const patientForm = usePatientForm(patientList.pacientes);
  const patientLookups = usePatientLookups();
  const cbhpmLookup = useCbhpmLookup();

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
    pacienteFormError,
    setPacienteFormError,
    patientFileInputKey,
    pendingPatientFiles,
    resetPacienteForm,
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
    isAdmin,
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
    setPacientesError,
  });

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
  const patientFiles = usePatientFiles({
    session,
    patientReadOnly,
    canEditPatients,
    patientForm,
    setPacientesError,
    loadPacientes,
    loadDashboardSummary,
  });
  const patientCommands = usePatientCommands({
    session,
    canCreatePatients,
    canEditPatients,
    canDeletePatients,
    patientForm,
    patientList,
    patientLookups,
    setModuleMode,
    navigateToView,
    loadPacientes,
    loadDashboardSummary,
    confirmAction,
  });

  const resetPatientsState = () => {
    resetPatientListState();
    resetPatientLookups();
    patientFiles.reset();
    patientObservacoesState.resetPatientObservacoesState();
    resetCbhpmLookup();
    resetPacienteForm();
  };

  const handleOpenCbhpmModal = () => {
    if (patientReadOnly || !canEditPatients) {
      return;
    }

    setCbhpmModalOpen(true);
    setCbhpmError('');
  };

  const handleSelectCbhpm = (procedimento: CbhpmGeral) => {
    setPacienteFormData((current) => {
      const nextProcedimentos = normalizePacienteProcedimentos([
        ...current.procedimentos,
        {
          cbhpmCodigo: procedimento.codigo,
          cbhpmPorte: procedimento.porte || '',
          procedimento: procedimento.procedimento,
          valorReferencia: procedimento.valorReferencia ?? null,
        },
      ]);

      return withPrimaryProcedimento({
        ...current,
        procedimentos: nextProcedimentos,
      });
    });
    setPacienteFormError('');
    setCbhpmModalOpen(false);
  };

  const handleRemovePacienteProcedimento = (indexToRemove: number) => {
    setPacienteFormData((current) => withPrimaryProcedimento({
      ...current,
      procedimentos: current.procedimentos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const openPatientsList = () => {
    if (!canAccessPatients) {
      return;
    }

    navigateToView('patients');
    setModuleMode('list');
  };

  const openNewPacienteForm = () => {
    if (!canCreatePatients) {
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
    navigateToView('patients');
    setModuleMode('form');

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
    setModuleMode('list');
  };

  const clearPacienteFilters = () => {
    setPacienteFilters(emptyPacienteFilters);
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

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
  }, [isAdmin]);

  useEffect(() => {
    if (pacienteCurrentPage > pacienteTotalPages) {
      setPacienteCurrentPage(pacienteTotalPages);
    }
  }, [pacienteCurrentPage, pacienteTotalPages]);

  useEffect(() => {
    if (cbhpmCurrentPage > cbhpmTotalPageCount) {
      setCbhpmCurrentPage(cbhpmTotalPageCount);
    }
  }, [cbhpmCurrentPage, cbhpmTotalPageCount]);

  return {
    pacientes,
    pacientesLoading,
    pacientesError,
    pacienteSuccessMessage,
    pacienteSearchTerm,
    setPacienteSearchTerm,
    pacienteExportLoading: patientExport.pacienteExportLoading,
    pacienteExportScope: patientExport.pacienteExportScope,
    setPacienteExportScope: patientExport.setPacienteExportScope,
    pacienteFilters,
    setPacienteFilters,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
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
    pacienteFormData,
    setPacienteFormData,
    editingPacienteId,
    editingPaciente,
    pacienteFormError,
    pacienteFormLoading,
    pendingPatientFiles,
    patientFileInputKey,
    selectedPatientInfo: patientFiles.selectedPatientInfo,
    setSelectedPatientInfo: patientFiles.setSelectedPatientInfo,
    selectedPatientFiles: patientFiles.selectedPatientFiles,
    patientFilesModalLoading: patientFiles.patientFilesModalLoading,
    patientFilesModalError: patientFiles.patientFilesModalError,
    selectedPatientObservacoes: patientObservacoesState.selectedPatientObservacoes,
    patientObservacoes: patientObservacoesState.patientObservacoes,
    patientObservacoesLoading: patientObservacoesState.patientObservacoesLoading,
    patientObservacoesSaving: patientObservacoesState.patientObservacoesSaving,
    patientObservacoesError: patientObservacoesState.patientObservacoesError,
    patientObservationDraft: patientObservacoesState.patientObservationDraft,
    setPatientObservationDraft: patientObservacoesState.setPatientObservationDraft,
    patientObservationReplyTo: patientObservacoesState.patientObservationReplyTo,
    setPatientObservationReplyTo: patientObservacoesState.setPatientObservationReplyTo,
    medicalUsers,
    hospitais,
    hospitaisError,
    convenios,
    conveniosError,
    opmeFornecedores,
    opmeFornecedoresError,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    cbhpmFilterHint,
    canConsultCbhpm,
    canSearchCbhpm,
    cbhpmLoading,
    cbhpmError,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    cbhpmSortBy,
    setCbhpmSortBy,
    cbhpmSortDirection,
    setCbhpmSortDirection,
    cbhpmTotalPageCount,
    cbhpmTotalItems,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    loadMedicalUsers,
    loadPacientes,
    loadHospitais,
    loadConvenios,
    loadOpmeFornecedores,
    loadCbhpm,
    resetPatientsState,
    resetPacienteForm,
    handleEditPaciente: patientCommands.handleEditPaciente,
    handlePacienteFilesChange: patientFiles.handleFilesChange,
    removePendingPatientFile: patientFiles.removePendingFile,
    handleSubmitPaciente: patientCommands.handleSubmitPaciente,
    handleDeletePaciente: patientCommands.handleDeletePaciente,
    handleDeletePacienteArquivo: patientFiles.deleteFile,
    handleOpenPacienteFiles: patientFiles.openFiles,
    handleOpenPacienteObservacoes: patientObservacoesState.handleOpenPacienteObservacoes,
    handleOpenPacienteObservacoesById: patientObservacoesState.handleOpenPacienteObservacoesById,
    handleSubmitPacienteObservacao: patientObservacoesState.handleSubmitPacienteObservacao,
    handleOpenCbhpmModal,
    handleSelectCbhpm,
    handleRemovePacienteProcedimento,
    handleExportPacientes: patientExport.handleExportPacientes,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    refreshPacientes,
    refreshCbhpm,
    closePatientFilesModal: patientFiles.closeFilesModal,
    closePatientObservacoesModal: patientObservacoesState.closePatientObservacoesModal,
  };
}

export type PatientsDomainState = ReturnType<typeof usePatientsDomain>;
