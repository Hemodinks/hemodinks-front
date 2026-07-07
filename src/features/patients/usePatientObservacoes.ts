import { type Dispatch, type SetStateAction, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { type AppView, type ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import {
  createPacienteObservacao,
  getPaciente,
  getPacienteObservacoes,
  markPacienteObservacoesAsRead,
} from '../../services';
import { queryKeys } from '../../shared/queryKeys';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AuthSession, Paciente, PacienteObservacao } from '../../types';

type UsePatientObservacoesOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  pacientes: Paciente[];
  editingPaciente: Paciente | null;
  setPacientes: Dispatch<SetStateAction<Paciente[]>>;
  setEditingPacienteDetails: Dispatch<SetStateAction<Paciente | null>>;
  loadPacientes: (token?: string, forceRefresh?: boolean) => Promise<void>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
};

export function usePatientObservacoes({
  session,
  activeView,
  moduleMode,
  pacientes,
  editingPaciente,
  setPacientes,
  setEditingPacienteDetails,
  loadPacientes,
  loadDashboardSummary,
}: UsePatientObservacoesOptions) {
  const [selectedPatientObservacoes, setSelectedPatientObservacoes] = useState<Paciente | null>(null);
  const [patientObservacoes, setPatientObservacoes] = useState<PacienteObservacao[]>([]);
  const [patientObservacoesLoading, setPatientObservacoesLoading] = useState(false);
  const [patientObservacoesSaving, setPatientObservacoesSaving] = useState(false);
  const [patientObservacoesError, setPatientObservacoesError] = useState('');
  const [patientObservationDraft, setPatientObservationDraft] = useState('');
  const [patientObservationReplyTo, setPatientObservationReplyTo] = useState<PacienteObservacao | null>(null);

  const createPacienteObservacaoMutation = useMutation({
    mutationFn: ({ pacienteId, texto, observacaoPaiId, token }: { pacienteId: number; texto: string; observacaoPaiId?: number | null; token: string }) => (
      createPacienteObservacao(pacienteId, { texto, observacaoPaiId }, token)
    ),
  });

  const clearObservationIndicators = (pacienteId: number) => {
    setPacientes((current) => current.map((paciente) => (
      paciente.id === pacienteId
        ? { ...paciente, observacoesNaoLidasCount: 0 }
        : paciente
    )));
    setSelectedPatientObservacoes((current) => (
      current && current.id === pacienteId
        ? { ...current, observacoesNaoLidasCount: 0 }
        : current
    ));
    setEditingPacienteDetails((current) => (
      current && current.id === pacienteId
        ? { ...current, observacoesNaoLidasCount: 0 }
        : current
    ));
  };

  const syncObservationViews = async (token: string, pacienteId: number, clearUnread = false) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardNotifications(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pacienteObservacoes(token, pacienteId) }),
    ]);

    if (clearUnread) {
      clearObservationIndicators(pacienteId);
    }

    if (activeView === 'patients' && moduleMode === 'list') {
      await loadPacientes(token, true);
    }

    await loadDashboardSummary(token, true);
  };

  const openPacienteObservacoesModal = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    setSelectedPatientObservacoes(paciente);
    setPatientObservacoes([]);
    setPatientObservationDraft('');
    setPatientObservationReplyTo(null);
    setPatientObservacoesError('');
    setPatientObservacoesLoading(true);

    try {
      const [details, observacoes] = await Promise.all([
        getPaciente(paciente.id, session.token),
        getPacienteObservacoes(paciente.id, session.token),
      ]);
      setSelectedPatientObservacoes(details);
      setPatientObservacoes(observacoes);

      const readResult = await markPacienteObservacoesAsRead(paciente.id, session.token);
      if (readResult.updatedCount > 0) {
        await syncObservationViews(session.token, paciente.id, true);
      }
    } catch (error) {
      setPatientObservacoesError(getErrorMessage(error));
    } finally {
      setPatientObservacoesLoading(false);
    }
  };

  const handleOpenPacienteObservacoes = async (paciente: Paciente) => {
    await openPacienteObservacoesModal(paciente);
  };

  const handleOpenPacienteObservacoesById = async (pacienteId: number) => {
    if (!session) {
      return;
    }

    const currentPaciente = pacientes.find((item) => item.id === pacienteId)
      ?? (editingPaciente?.id === pacienteId ? editingPaciente : null)
      ?? (selectedPatientObservacoes?.id === pacienteId ? selectedPatientObservacoes : null);

    if (currentPaciente) {
      await openPacienteObservacoesModal(currentPaciente);
      return;
    }

    try {
      const details = await getPaciente(pacienteId, session.token);
      await openPacienteObservacoesModal(details);
    } catch (error) {
      setPatientObservacoesError(getErrorMessage(error));
    }
  };

  const handleSubmitPacienteObservacao = async () => {
    if (!session || !selectedPatientObservacoes) {
      return;
    }

    const texto = patientObservationDraft.trim();
    if (!texto) {
      setPatientObservacoesError('Informe a observação.');
      return;
    }

    setPatientObservacoesSaving(true);
    setPatientObservacoesError('');

    try {
      await createPacienteObservacaoMutation.mutateAsync({
        pacienteId: selectedPatientObservacoes.id,
        texto,
        observacaoPaiId: patientObservationReplyTo?.id ?? null,
        token: session.token,
      });

      const observacoes = await getPacienteObservacoes(selectedPatientObservacoes.id, session.token);
      setPatientObservacoes(observacoes);
      setPatientObservationDraft('');
      setPatientObservationReplyTo(null);
      await syncObservationViews(session.token, selectedPatientObservacoes.id);
    } catch (error) {
      setPatientObservacoesError(getErrorMessage(error));
    } finally {
      setPatientObservacoesSaving(false);
    }
  };

  const closePatientObservacoesModal = () => {
    setSelectedPatientObservacoes(null);
    setPatientObservacoes([]);
    setPatientObservacoesError('');
    setPatientObservacoesLoading(false);
    setPatientObservacoesSaving(false);
    setPatientObservationDraft('');
    setPatientObservationReplyTo(null);
  };

  const resetPatientObservacoesState = () => {
    closePatientObservacoesModal();
  };

  return {
    selectedPatientObservacoes,
    patientObservacoes,
    patientObservacoesLoading,
    patientObservacoesSaving,
    patientObservacoesError,
    patientObservationDraft,
    setPatientObservationDraft,
    patientObservationReplyTo,
    setPatientObservationReplyTo,
    handleOpenPacienteObservacoes,
    handleOpenPacienteObservacoesById,
    handleSubmitPacienteObservacao,
    closePatientObservacoesModal,
    resetPatientObservacoesState,
  };
}
