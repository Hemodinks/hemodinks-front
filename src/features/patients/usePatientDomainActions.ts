import type { Dispatch, SetStateAction } from 'react';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { CbhpmGeral } from './patientTypes';
import {
  emptyPacienteFilters,
  normalizePacienteProcedimentos,
  withPrimaryProcedimento,
} from './patientUtils';
import type { useCbhpmLookup } from './useCbhpmLookup';
import type { usePatientForm } from './usePatientForm';
import type { usePatientLookups } from './usePatientLookups';

type PatientDomainActionsOptions = {
  session: AuthSession | null;
  isMedical: boolean;
  canAccessPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canConsultCbhpm: boolean;
  patientReadOnly: boolean;
  canSearchCbhpm: boolean;
  patientForm: ReturnType<typeof usePatientForm>;
  patientLookups: ReturnType<typeof usePatientLookups>;
  cbhpmLookup: ReturnType<typeof useCbhpmLookup>;
  setPacienteFilters: ReturnType<
    typeof import('./usePatientList').usePatientList
  >['setPacienteFilters'];
  setPacienteSuccessMessage: (message: string) => void;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  loadMedicalUsers: (token: string, forceRefresh?: boolean) => Promise<void>;
  loadPacientes: (token: string, forceRefresh?: boolean) => Promise<void>;
  loadHospitais: (token: string, forceRefresh?: boolean) => Promise<void>;
  loadOpmeFornecedores: (token: string, forceRefresh?: boolean) => Promise<void>;
};

export function usePatientDomainActions({
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
}: PatientDomainActionsOptions) {
  const handleOpenCbhpmModal = () => {
    if (patientReadOnly || !canEditPatients) {
      return;
    }
    cbhpmLookup.setCbhpmModalOpen(true);
    cbhpmLookup.setCbhpmError('');
  };

  const handleSelectCbhpm = (procedimento: CbhpmGeral) => {
    patientForm.setPacienteFormData((current) => {
      const procedimentos = normalizePacienteProcedimentos([
        ...current.procedimentos,
        {
          cbhpmCodigo: procedimento.codigo,
          cbhpmPorte: procedimento.porte || '',
          procedimento: procedimento.procedimento,
          valorReferencia: procedimento.valorReferencia ?? null,
        },
      ]);
      return withPrimaryProcedimento({ ...current, procedimentos });
    });
    patientForm.setPacienteFormError('');
    cbhpmLookup.setCbhpmModalOpen(false);
  };

  const handleRemovePacienteProcedimento = (indexToRemove: number) => {
    patientForm.setPacienteFormData((current) =>
      withPrimaryProcedimento({
        ...current,
        procedimentos: current.procedimentos.filter((_, index) => index !== indexToRemove),
      }),
    );
  };

  const openPatientsList = () => {
    if (canAccessPatients) {
      navigateToView('patients');
      setModuleMode('list');
    }
  };

  const openNewPacienteForm = () => {
    if (!canCreatePatients) {
      return;
    }
    patientForm.resetPacienteForm();
    if (isMedical && session) {
      patientForm.setPacienteFormData((current) => ({
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
      if (!patientLookups.hospitais.length) {
        void loadHospitais(session.token);
      }
      if (!patientLookups.opmeFornecedores.length) {
        void loadOpmeFornecedores(session.token);
      }
    }
  };

  const closePacienteForm = () => {
    patientForm.resetPacienteForm();
    setModuleMode('list');
  };

  const clearPacienteFilters = () => setPacienteFilters(emptyPacienteFilters);
  const refreshPacientes = () => {
    if (session) {
      void loadPacientes(session.token, true);
    }
  };
  const refreshCbhpm = () => {
    cbhpmLookup.applyCbhpmFiltersNow();
    if (session && canSearchCbhpm && canConsultCbhpm) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cbhpmRoot(session.token),
      });
    }
  };

  return {
    handleOpenCbhpmModal,
    handleSelectCbhpm,
    handleRemovePacienteProcedimento,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    refreshPacientes,
    refreshCbhpm,
  };
}
