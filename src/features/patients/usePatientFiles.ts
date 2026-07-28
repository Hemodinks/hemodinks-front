import { type ChangeEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deletePacienteArquivo, getPaciente } from '../../services';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { Paciente } from './patientTypes';
import { getInvalidPatientFileMessage } from './patientDomainHelpers';
import type { usePatientForm } from './usePatientForm';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';

type PatientFormState = ReturnType<typeof usePatientForm>;

type PatientFilesOptions = {
  session: AuthSession | null;
  patientReadOnly: boolean;
  canEditPatients: boolean;
  patientForm: PatientFormState;
  setPacientesError: (message: string) => void;
  loadPacientes: (token?: string, forceRefresh?: boolean) => Promise<unknown>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
};

export function usePatientFiles({
  session,
  patientReadOnly,
  canEditPatients,
  patientForm,
  setPacientesError,
  loadPacientes,
  loadDashboardSummary,
}: PatientFilesOptions) {
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<Paciente | null>(null);
  const [selectedPatientFiles, setSelectedPatientFiles] = useState<Paciente | null>(null);
  const [patientFilesModalError, setPatientFilesModalError] = useState('');
  const deleteFileMutation = useMutation({
    mutationFn: ({
      pacienteId,
      arquivoId,
      token,
    }: {
      pacienteId: number;
      arquivoId: number;
      token: string;
    }) => deletePacienteArquivo(pacienteId, arquivoId, token),
  });
  const filesOperation = useAsyncOperation((_signal, pacienteId: number, token: string) =>
    getPaciente(pacienteId, token),
  );

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (patientReadOnly || !files.length) return;

    const invalidFileMessage = getInvalidPatientFileMessage(files);
    if (invalidFileMessage) {
      patientForm.setPacienteFormError(invalidFileMessage);
      return;
    }

    patientForm.setPendingPatientFiles((current) => [...current, ...files]);
    patientForm.setPacienteFormError('');
  };

  const removePendingFile = (indexToRemove: number) => {
    patientForm.setPendingPatientFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const deleteFile = async (paciente: Paciente, arquivoId: number) => {
    if (!session) return;
    if (!canEditPatients) {
      setPacientesError('Sem permissao para excluir arquivo do paciente.');
      return;
    }

    setPacientesError('');
    try {
      await deleteFileMutation.mutateAsync({
        pacienteId: paciente.id,
        arquivoId,
        token: session.token,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardSummary(session.token),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pacientesRoot(session.token),
        }),
      ]);
      const details = await getPaciente(paciente.id, session.token);
      patientForm.setEditingPacienteDetails(details);
      await loadPacientes(session.token, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const openFiles = async (paciente: Paciente) => {
    if (!session) return;
    const filesCount = paciente.arquivosCount ?? paciente.arquivos.length;
    if (!filesCount) return;

    setSelectedPatientFiles(paciente);
    setPatientFilesModalError('');
    try {
      setSelectedPatientFiles(await filesOperation.execute(paciente.id, session.token));
    } catch (error) {
      setPatientFilesModalError(getErrorMessage(error));
    }
  };

  const closeFilesModal = () => {
    setSelectedPatientFiles(null);
    setPatientFilesModalError('');
  };

  const reset = () => {
    setSelectedPatientInfo(null);
    setSelectedPatientFiles(null);
    setPatientFilesModalError('');
    filesOperation.reset();
  };

  return {
    selectedPatientInfo,
    setSelectedPatientInfo,
    selectedPatientFiles,
    patientFilesModalLoading: filesOperation.isLoading,
    patientFilesModalError,
    handleFilesChange,
    removePendingFile,
    deleteFile,
    openFiles,
    closeFilesModal,
    reset,
  };
}
