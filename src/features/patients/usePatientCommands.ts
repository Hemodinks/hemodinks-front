import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createPaciente,
  createPacienteObservacao,
  deletePaciente,
  getPaciente,
  updatePaciente,
  uploadPacienteArquivo,
} from '../../services';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { queryKeys } from '../../shared/queryKeys';
import { DEFAULT_PASSWORD, getErrorMessage } from '../../shared/utils/formatters';
import { sortPacientesForListing } from '../../shared/utils/listing';
import type { AuthSession, Paciente, PacientePayload } from '../../types';
import { buildPatientPayloadWithLookups } from './patientDomainHelpers';
import { validatePacienteForm } from './patientUtils';
import type { usePatientForm } from './usePatientForm';
import type { usePatientList } from './usePatientList';
import type { usePatientLookups } from './usePatientLookups';

type PatientCommandsOptions = {
  session: AuthSession | null;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  patientForm: ReturnType<typeof usePatientForm>;
  patientList: ReturnType<typeof usePatientList>;
  patientLookups: ReturnType<typeof usePatientLookups>;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  loadPacientes: (token?: string, forceRefresh?: boolean) => Promise<unknown>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  confirmAction: ConfirmAction;
};

export function usePatientCommands({
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
}: PatientCommandsOptions) {
  const savePacienteMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: PacientePayload; token: string }) => (
      id ? updatePaciente(id, payload, token) : createPaciente(payload, token)
    ),
  });
  const deletePacienteMutation = useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) => deletePaciente(id, token),
  });
  const createPacienteObservacaoMutation = useMutation({
    mutationFn: ({ pacienteId, texto, token }: { pacienteId: number; texto: string; token: string }) => (
      createPacienteObservacao(pacienteId, { texto }, token)
    ),
  });

  const handleEditPaciente = async (paciente: Paciente) => {
    if (!session) return;

    patientForm.setPacienteFormError('');
    patientList.setPacienteSuccessMessage('');
    navigateToView('patients');
    patientForm.setPendingPatientFiles([]);
    patientForm.setPacienteFormLoading(true);

    try {
      const details = await getPaciente(paciente.id, session.token);
      patientForm.applyPacienteToForm(details);
    } catch (error) {
      patientForm.applyPacienteToForm(paciente);
      patientForm.setPacienteFormError(getErrorMessage(error));
    } finally {
      patientForm.setPacienteFormLoading(false);
      setModuleMode('form');
    }
  };

  const handleSubmitPaciente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    if (patientForm.editingPacienteId && !canEditPatients) {
      patientForm.setPacienteFormError('Sem permissao para editar pacientes.');
      return;
    }
    if (!patientForm.editingPacienteId && !canCreatePatients) {
      patientForm.setPacienteFormError('Sem permissao para cadastrar pacientes.');
      return;
    }

    const validationError = validatePacienteForm(patientForm.pacienteFormData);
    if (validationError) {
      patientForm.setPacienteFormError(validationError);
      return;
    }

    const {
      payload,
      selectedMedico,
      selectedMedicoAuxiliar1,
      selectedMedicoAuxiliar2,
    } = buildPatientPayloadWithLookups({
      pacienteFormData: patientForm.pacienteFormData,
      medicalUsers: patientLookups.medicalUsers,
      hospitais: patientLookups.hospitais,
      convenios: patientLookups.convenios,
      opmeFornecedores: patientLookups.opmeFornecedores,
    });

    if (selectedMedico.trimmedName && !selectedMedico.selectedUser && !selectedMedico.hasScopedSelection) {
      patientForm.setPacienteFormError('Selecione um cirurgião cadastrado com perfil Médicos.');
      return;
    }
    if (selectedMedicoAuxiliar1.trimmedName && !selectedMedicoAuxiliar1.selectedUser && !selectedMedicoAuxiliar1.hasScopedSelection) {
      patientForm.setPacienteFormError('Selecione o médico auxiliar 1 no cadastro de médicos.');
      return;
    }
    if (selectedMedicoAuxiliar2.trimmedName && !selectedMedicoAuxiliar2.selectedUser && !selectedMedicoAuxiliar2.hasScopedSelection) {
      patientForm.setPacienteFormError('Selecione o médico auxiliar 2 no cadastro de médicos.');
      return;
    }

    const observationText = patientForm.pacienteFormData.novaObservacao.trim();
    patientForm.setPacienteFormLoading(true);
    patientForm.setPacienteFormError('');
    patientList.setPacienteSuccessMessage('');

    try {
      const savedPaciente = await savePacienteMutation.mutateAsync({
        id: patientForm.editingPacienteId,
        payload,
        token: session.token,
      });
      let warningMessage = '';

      for (const file of patientForm.pendingPatientFiles) {
        await uploadPacienteArquivo(savedPaciente.id, file, session.token);
      }
      if (observationText) {
        try {
          await createPacienteObservacaoMutation.mutateAsync({
            pacienteId: savedPaciente.id,
            texto: observationText,
            token: session.token,
          });
        } catch (error) {
          warningMessage = getErrorMessage(error);
        }
      }

      patientList.setPacientes((current) => sortPacientesForListing(
        patientForm.editingPacienteId
          ? current.map((paciente) => (paciente.id === savedPaciente.id ? savedPaciente : paciente))
          : [savedPaciente, ...current],
      ));
      const baseSuccessMessage = patientForm.editingPacienteId
        ? 'Paciente atualizado.'
        : `Paciente cadastrado com senha inicial ${DEFAULT_PASSWORD}.`;
      patientList.setPacienteSuccessMessage(
        warningMessage
          ? `${baseSuccessMessage} Paciente salvo, mas a observação não foi enviada.`
          : observationText
            ? `${baseSuccessMessage} Observação enviada.`
            : baseSuccessMessage,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardNotifications(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacienteObservacoesRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hospitais(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.convenios(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.opmeFornecedores(session.token) }),
      ]);
      patientForm.resetPacienteForm();
      patientList.setPacienteCurrentPage(1);
      setModuleMode('list');
      await loadPacientes(session.token, true);
      await loadDashboardSummary(session.token, true);
      if (warningMessage) patientList.setPacientesError(warningMessage);
    } catch (error) {
      patientForm.setPacienteFormError(getErrorMessage(error));
    } finally {
      patientForm.setPacienteFormLoading(false);
    }
  };

  const deleteSelectedPaciente = async (paciente: Paciente) => {
    if (!session) return;
    if (!canDeletePatients) {
      patientList.setPacientesError('Apenas administradores podem excluir pacientes.');
      return;
    }

    patientList.setPacientesError('');
    patientList.setPacienteSuccessMessage('');
    try {
      await deletePacienteMutation.mutateAsync({ id: paciente.id, token: session.token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
      ]);
      patientList.setPacienteSuccessMessage('Paciente excluído.');
      await loadPacientes(session.token, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      patientList.setPacientesError(getErrorMessage(error));
    }
  };

  const handleDeletePaciente = (paciente: Paciente) => {
    confirmAction({
      tone: 'delete',
      title: 'Excluir paciente?',
      message: `Deseja excluir "${paciente.nomePaciente}"? Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: () => deleteSelectedPaciente(paciente),
    });
  };

  return { handleEditPaciente, handleSubmitPaciente, handleDeletePaciente };
}
