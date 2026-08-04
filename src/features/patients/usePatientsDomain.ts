import { type Dispatch, type SetStateAction, useEffect } from 'react';
import type { AppView, ModuleMode } from '../../appTypes';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { emptyPacienteFilters } from './patientUtils';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { usePatientExport } from './usePatientExport';
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientObservacoes } from './usePatientObservacoes';
import { usePatientFiles } from './usePatientFiles';
import { usePatientCommands } from './usePatientCommands';
import { usePatientDomainActions } from './usePatientDomainActions';
import { createPatientsDomainState } from './createPatientsDomainState';

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
  const cbhpmLookup = useCbhpmLookup();

  const {
    setPacientesError,
    setPacienteSuccessMessage,
    pacienteFilters,
    setPacienteFilters,
    setDebouncedPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
    resetPatientListState,
  } = patientList;
  const { cbhpmCurrentPage, setCbhpmCurrentPage, resetCbhpmLookup } = cbhpmLookup;

  const queries = usePatientsDomainQueries({
    session,
    activeView,
    moduleMode,
    isAdmin,
    canAccessPatients,
    canConsultCbhpm,
    patientReadOnly,
    patientList,
    cbhpmLookup,
  });
  const {
    pacientes,
    pacientesTotalPages,
    canSearchCbhpm,
    cbhpmTotalPages,
    loadMedicalUsers,
    loadPacientes,
    loadHospitais,
    loadOpmeFornecedores,
  } = queries;
  const patientLookups = {
    medicalUsers: queries.medicalUsers,
    hospitais: queries.hospitais,
    hospitaisError: queries.hospitaisError,
    convenios: queries.convenios,
    conveniosError: queries.conveniosError,
    opmeFornecedores: queries.opmeFornecedores,
    opmeFornecedoresError: queries.opmeFornecedoresError,
  };
  const patientForm = usePatientForm(pacientes);
  const { setEditingPacienteDetails, editingPaciente, resetPacienteForm } = patientForm;
  const patientExport = usePatientExport({
    session,
    companyName,
    paginatedPacientes: pacientes,
    pacienteFilters,
    setPacientesError,
  });

  const patientObservacoesState = usePatientObservacoes({
    session,
    activeView,
    moduleMode,
    pacientes,
    editingPaciente,
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
  const patientActions = usePatientDomainActions({
    session,
    isMedical,
    canAccessPatients,
    canCreatePatients,
    canEditPatients,
    canConsultCbhpm,
    patientReadOnly,
    canSearchCbhpm,
    patientForm,
    patientLookups,
    cbhpmLookup,
    setPacienteFilters,
    setPacienteSuccessMessage,
    setModuleMode,
    navigateToView,
    loadMedicalUsers,
    loadPacientes,
    loadHospitais,
    loadOpmeFornecedores,
  });

  const resetPatientsState = () => {
    resetPatientListState();
    patientFiles.reset();
    patientObservacoesState.resetPatientObservacoesState();
    resetCbhpmLookup();
    resetPacienteForm();
  };

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
  }, [isAdmin]);

  useEffect(() => {
    const totalPages = Math.max(1, pacientesTotalPages);
    if (pacienteCurrentPage > totalPages) {
      setPacienteCurrentPage(totalPages);
    }
  }, [pacienteCurrentPage, pacientesTotalPages]);

  useEffect(() => {
    const totalPages = Math.max(1, cbhpmTotalPages);
    if (cbhpmCurrentPage > totalPages) {
      setCbhpmCurrentPage(totalPages);
    }
  }, [cbhpmCurrentPage, cbhpmTotalPages]);

  return createPatientsDomainState({
    patientList,
    patientForm,
    cbhpmLookup,
    queries,
    patientExport,
    patientObservacoes: patientObservacoesState,
    patientFiles,
    patientCommands,
    patientActions,
    canConsultCbhpm,
    resetPatientsState,
  });
}

export type PatientsDomainState = ReturnType<typeof usePatientsDomain>;
