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
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { Paciente, PacienteObservacao } from './patientTypes';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';

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
  const [selectedPatientObservacoes, setSelectedPatientObservacoes] = useState<Paciente | null>(
    null,
  );
  const [patientObservacoes, setPatientObservacoes] = useState<PacienteObservacao[]>([]);
  const [patientObservacoesError, setPatientObservacoesError] = useState('');
  const [patientObservationDraft, setPatientObservationDraft] = useState('');
  const [patientObservationReplyTo, setPatientObservationReplyTo] =
    useState<PacienteObservacao | null>(null);

  const createPacienteObservacaoMutation = useMutation({
    mutationFn: ({
      pacienteId,
      texto,
      observacaoPaiId,
      token,
    }: {
      pacienteId: number;
      texto: string;
      observacaoPaiId?: number | null;
      token: string;
    }) => createPacienteObservacao(pacienteId, { texto, observacaoPaiId }, token),
  });
  const openObservacoesOperation = useAsyncOperation((_signal, action: () => Promise<void>) =>
    action(),
  );
  const saveObservacaoOperation = useAsyncOperation((_signal, action: () => Promise<void>) =>
    action(),
  );

  const clearObservationIndicators = (pacienteId: number) => {
    setPacientes((current) =>
      current.map((paciente) =>
        paciente.id === pacienteId ? { ...paciente, observacoesNaoLidasCount: 0 } : paciente,
      ),
    );
    setSelectedPatientObservacoes((current) =>
      current && current.id === pacienteId ? { ...current, observacoesNaoLidasCount: 0 } : current,
    );
    setEditingPacienteDetails((current) =>
      current && current.id === pacienteId ? { ...current, observacoesNaoLidasCount: 0 } : current,
    );
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

    try {
      await openObservacoesOperation.execute(async () => {
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
      });
    } catch (error) {
      setPatientObservacoesError(getErrorMessage(error));
    }
  };

  const handleOpenPacienteObservacoes = async (paciente: Paciente) => {
    await openPacienteObservacoesModal(paciente);
  };

  const handleOpenPacienteObservacoesById = async (pacienteId: number) => {
    if (!session) {
      return;
    }

    const currentPaciente =
      pacientes.find((item) => item.id === pacienteId) ??
      (editingPaciente?.id === pacienteId ? editingPaciente : null) ??
      (selectedPatientObservacoes?.id === pacienteId ? selectedPatientObservacoes : null);

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

    setPatientObservacoesError('');

    try {
      await saveObservacaoOperation.execute(async () => {
        await createPacienteObservacaoMutation.mutateAsync({
          pacienteId: selectedPatientObservacoes.id,
          texto,
          observacaoPaiId: patientObservationReplyTo?.id ?? null,
          token: session.token,
        });

        const observacoes = await getPacienteObservacoes(
          selectedPatientObservacoes.id,
          session.token,
        );
        setPatientObservacoes(observacoes);
        setPatientObservationDraft('');
        setPatientObservationReplyTo(null);
        await syncObservationViews(session.token, selectedPatientObservacoes.id);
      });
    } catch (error) {
      setPatientObservacoesError(getErrorMessage(error));
    }
  };

  const closePatientObservacoesModal = () => {
    setSelectedPatientObservacoes(null);
    setPatientObservacoes([]);
    setPatientObservacoesError('');
    openObservacoesOperation.reset();
    saveObservacaoOperation.reset();
    setPatientObservationDraft('');
    setPatientObservationReplyTo(null);
  };

  const resetPatientObservacoesState = () => {
    closePatientObservacoesModal();
  };

  return {
    selectedPatientObservacoes,
    patientObservacoes,
    patientObservacoesLoading: openObservacoesOperation.isLoading,
    patientObservacoesSaving: saveObservacaoOperation.isLoading,
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
