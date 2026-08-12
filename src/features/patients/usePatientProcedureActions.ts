import type { Dispatch, SetStateAction } from 'react';
import type { CbhpmGeral, PacienteFormData } from '../../types';
import { normalizePacienteProcedimentos, withPrimaryProcedimento } from './patientUtils';

type Options = {
  readOnly: boolean;
  canEdit: boolean;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
  setFormError: Dispatch<SetStateAction<string>>;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  setLookupError: Dispatch<SetStateAction<string>>;
};

export function usePatientProcedureActions({
  readOnly,
  canEdit,
  setFormData,
  setFormError,
  setModalOpen,
  setLookupError,
}: Options) {
  const handleOpenCbhpmModal = () => {
    if (readOnly || !canEdit) return;
    setModalOpen(true);
    setLookupError('');
  };

  const handleSelectCbhpm = (procedimento: CbhpmGeral) => {
    setFormData((current) => withPrimaryProcedimento({
      ...current,
      procedimentos: normalizePacienteProcedimentos([
        ...current.procedimentos,
        {
          cbhpmCodigo: procedimento.codigo,
          cbhpmPorte: procedimento.porte || '',
          procedimento: procedimento.procedimento,
          valorReferencia: procedimento.valorReferencia ?? null,
        },
      ]),
    }));
    setFormError('');
    setModalOpen(false);
  };

  const handleRemovePacienteProcedimento = (indexToRemove: number) => {
    setFormData((current) => withPrimaryProcedimento({
      ...current,
      procedimentos: current.procedimentos.filter((_, index) => index !== indexToRemove),
    }));
  };

  return {
    handleOpenCbhpmModal,
    handleSelectCbhpm,
    handleRemovePacienteProcedimento,
  };
}
