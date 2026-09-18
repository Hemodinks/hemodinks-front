import type { Dispatch, SetStateAction } from 'react';
import type { PacienteFormData } from '../../../types';
import { DateInput } from '../../../shared/components/DateInput';
import { TextField } from '../../../shared/components/ui';
import { MAX_NAME_LENGTH } from '../../../shared/utils/formatters';

type Props = {
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
};

export function PatientIdentificationSection({ formData, setFormData }: Props) {
  return (
    <>
      <TextField
        className="patient-form-full-width"
        label="Paciente"
        type="text"
        value={formData.nomePaciente}
        onValueChange={(value) => setFormData((current) => ({ ...current, nomePaciente: value.slice(0, MAX_NAME_LENGTH) }))}
        maxLength={MAX_NAME_LENGTH}
        required
      />
      <DateInput
        id="patient-procedure-date"
        label="Data da Solicitação"
        value={formData.data || ''}
        onChange={(value) => setFormData((current) => ({ ...current, data: value }))}
      />
      <DateInput
        id="patient-appointment-date"
        label="Cirurgias Consolidadas"
        max=""
        value={formData.dataAtendimento || ''}
        onChange={(value) => setFormData((current) => ({ ...current, dataAtendimento: value }))}
      />
    </>
  );
}
