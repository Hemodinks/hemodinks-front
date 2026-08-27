import { type FormEvent, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createPaciente, createPacienteObservacao, deletePaciente, deletePacienteArquivo, getPaciente, updatePaciente, uploadPacienteArquivo } from '../../services';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { getErrorMessage } from '../../shared/utils/formatters';
import { sortPacientesForListing } from '../../shared/utils/listing';
import type { AuthSession, Paciente, PacientePayload } from '../../types';
import type { ModuleMode } from '../../appTypes';
import { preparePatientPayload } from './patientDomainHelpers';
import type { usePatientForm } from './usePatientForm';
import type { usePatientList } from './usePatientList';
import type { usePatientLookups } from './usePatientLookups';

type UsePatientCrudActionsOptions = {
  session: AuthSession | null;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  patientList: ReturnType<typeof usePatientList>;
  patientForm: ReturnType<typeof usePatientForm>;
  patientLookups: ReturnType<typeof usePatientLookups>;
  setModuleMode: React.Dispatch<React.SetStateAction<ModuleMode>>;
  navigateToPatients: () => void;
  loadPacientes: (token?: string, forceRefresh?: boolean) => Promise<void>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  confirmAction: ConfirmAction;
};

export function usePatientCrudActions(options: UsePatientCrudActionsOptions) {
  const { session, canCreatePatients, canEditPatients, canDeletePatients, patientList, patientForm, patientLookups,
    setModuleMode, navigateToPatients, loadPacientes, loadDashboardSummary, confirmAction } = options;
  const submitInFlightRef = useRef(false);
  const saveMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: PacientePayload; token: string }) =>
      id ? updatePaciente(id, payload, token) : createPaciente(payload, token),
  });
  const deleteMutation = useMutation({ mutationFn: ({ id, token }: { id: number; token: string }) => deletePaciente(id, token) });
  const deleteFileMutation = useMutation({
    mutationFn: ({ pacienteId, arquivoId, token }: { pacienteId: number; arquivoId: number; token: string }) =>
      deletePacienteArquivo(pacienteId, arquivoId, token),
  });
  const createObservationMutation = useMutation({
    mutationFn: ({ pacienteId, texto, token }: { pacienteId: number; texto: string; token: string }) =>
      createPacienteObservacao(pacienteId, { texto }, token),
  });

  const handleEditPaciente = async (paciente: Paciente) => {
    if (!session) return;
    patientForm.setPacienteFormError('');
    patientList.setPacienteSuccessMessage('');
    navigateToPatients();
    patientForm.setPendingPatientFiles([]);
    patientForm.setPacienteFormLoading(true);
    try {
      patientForm.applyPacienteToForm(await getPaciente(paciente.id, session.token));
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
    if (!session || submitInFlightRef.current) return;
    if (patientForm.editingPacienteId && !canEditPatients) {
      patientForm.setPacienteFormError('Sem permissao para editar pacientes.'); return;
    }
    if (!patientForm.editingPacienteId && !canCreatePatients) {
      patientForm.setPacienteFormError('Sem permissao para cadastrar pacientes.'); return;
    }
    const prepared = preparePatientPayload({ pacienteFormData: patientForm.pacienteFormData, medicalUsers: patientLookups.medicalUsers,
      hospitais: patientLookups.hospitais, convenios: patientLookups.convenios, opmeFornecedores: patientLookups.opmeFornecedores });
    if (prepared.error || !prepared.payload) { patientForm.setPacienteFormError(prepared.error); return; }

    submitInFlightRef.current = true;
    patientForm.setPacienteFormLoading(true);
    patientForm.setPacienteFormError('');
    patientList.setPacienteSuccessMessage('');
    const observationText = patientForm.pacienteFormData.novaObservacao.trim();
    try {
      const savedPaciente = await saveMutation.mutateAsync({ id: patientForm.editingPacienteId, payload: prepared.payload, token: session.token });
      let warningMessage = '';
      for (const file of patientForm.pendingPatientFiles) await uploadPacienteArquivo(savedPaciente.id, file, session.token);
      if (observationText) {
        try { await createObservationMutation.mutateAsync({ pacienteId: savedPaciente.id, texto: observationText, token: session.token }); }
        catch (error) { warningMessage = getErrorMessage(error); }
      }
      patientList.setPacientes((current) => sortPacientesForListing(patientForm.editingPacienteId
        ? current.map((item) => item.id === savedPaciente.id ? savedPaciente : item)
        : [savedPaciente, ...current]));
      const baseMessage = patientForm.editingPacienteId ? 'Paciente atualizado.' : 'Paciente cadastrado com senha temporária. Oriente a alteração no primeiro acesso.';
      patientList.setPacienteSuccessMessage(warningMessage ? `${baseMessage} Paciente salvo, mas a observação não foi enviada.`
        : observationText ? `${baseMessage} Observação enviada.` : baseMessage);
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
      submitInFlightRef.current = false;
      patientForm.setPacienteFormLoading(false);
    }
  };

  const deleteSelectedPaciente = async (paciente: Paciente) => {
    if (!session) return;
    if (!canDeletePatients) { patientList.setPacientesError('Apenas administradores podem excluir pacientes.'); return; }
    patientList.setPacientesError(''); patientList.setPacienteSuccessMessage('');
    try {
      await deleteMutation.mutateAsync({ id: paciente.id, token: session.token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
      ]);
      patientList.setPacienteSuccessMessage('Paciente excluído.');
      await loadPacientes(session.token, true); await loadDashboardSummary(session.token, true);
    } catch (error) { patientList.setPacientesError(getErrorMessage(error)); }
  };
  const handleDeletePaciente = (paciente: Paciente) => confirmAction({ tone: 'delete', title: 'Excluir paciente?',
    message: `Deseja excluir "${paciente.nomePaciente}"? Esta ação não poderá ser desfeita.`, confirmLabel: 'Sim', cancelLabel: 'Não',
    onConfirm: () => deleteSelectedPaciente(paciente) });

  const handleDeletePacienteArquivo = async (paciente: Paciente, arquivoId: number) => {
    if (!session) return;
    if (!canEditPatients) { patientList.setPacientesError('Sem permissao para excluir arquivo do paciente.'); return; }
    patientList.setPacientesError('');
    try {
      await deleteFileMutation.mutateAsync({ pacienteId: paciente.id, arquivoId, token: session.token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
      ]);
      patientForm.setEditingPacienteDetails(await getPaciente(paciente.id, session.token));
      await loadPacientes(session.token, true); await loadDashboardSummary(session.token, true);
    } catch (error) { patientList.setPacientesError(getErrorMessage(error)); }
  };

  return { handleEditPaciente, handleSubmitPaciente, handleDeletePaciente, handleDeletePacienteArquivo };
}
