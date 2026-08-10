import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { getPaciente } from '../../services';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AuthSession, Paciente } from '../../types';
import { getInvalidPatientFileMessage } from './patientDomainHelpers';

type UsePatientFileActionsOptions = {
  session: AuthSession | null;
  readOnly: boolean;
  setFormError: (message: string) => void;
  setPendingFiles: Dispatch<SetStateAction<File[]>>;
};

export function usePatientFileActions({
  session,
  readOnly,
  setFormError,
  setPendingFiles,
}: UsePatientFileActionsOptions) {
  const [selectedPatientFiles, setSelectedPatientFiles] = useState<Paciente | null>(null);
  const [patientFilesModalLoading, setPatientFilesModalLoading] = useState(false);
  const [patientFilesModalError, setPatientFilesModalError] = useState('');

  const handlePacienteFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (readOnly || !files.length) return;

    const invalidFileMessage = getInvalidPatientFileMessage(files);
    if (invalidFileMessage) {
      setFormError(invalidFileMessage);
      return;
    }
    setPendingFiles((current) => [...current, ...files]);
    setFormError('');
  };

  const removePendingPatientFile = (indexToRemove: number) => {
    setPendingFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleOpenPacienteFiles = async (paciente: Paciente) => {
    if (!session || !(paciente.arquivosCount ?? paciente.arquivos.length)) return;

    setSelectedPatientFiles(paciente);
    setPatientFilesModalError('');
    setPatientFilesModalLoading(true);
    try {
      setSelectedPatientFiles(await getPaciente(paciente.id, session.token));
    } catch (error) {
      setPatientFilesModalError(getErrorMessage(error));
    } finally {
      setPatientFilesModalLoading(false);
    }
  };

  const closePatientFilesModal = () => {
    setSelectedPatientFiles(null);
    setPatientFilesModalError('');
  };

  return {
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
  };
}
