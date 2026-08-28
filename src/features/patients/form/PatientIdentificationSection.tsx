import type { Dispatch, SetStateAction } from 'react';
import type { PacienteFormData } from '../../../types';
import { DateInput } from '../../../shared/components/DateInput';
import { TextField, TextareaField } from '../../../shared/components/ui';
import {
  MAX_DIAGNOSIS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TREATMENT_MEDICAL_LENGTH,
} from '../../../shared/utils/formatters';

type Props = {
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
};

export function PatientIdentificationSection({ formData, setFormData }: Props) {
  return (
    <>
      <DateInput
        id="patient-procedure-date"
        label="Data da Solicitação"
        value={formData.data || ''}
        onChange={(value) => setFormData((current) => ({ ...current, data: value }))}
      />
      <DateInput
        id="patient-appointment-date"
        label="Cirurgias Consolidadas"
        value={formData.dataAtendimento || ''}
        onChange={(value) => setFormData((current) => ({ ...current, dataAtendimento: value }))}
      />
      <TextField
        label="Paciente"
        type="text"
        value={formData.nomePaciente}
        onValueChange={(value) => setFormData((current) => ({ ...current, nomePaciente: value.slice(0, MAX_NAME_LENGTH) }))}
        maxLength={MAX_NAME_LENGTH}
        required
      />
      <div className="two-column-fields">
        <TextareaField
          className="patient-form-tall-field"
          label="Informações Adicionais"
          value={formData.diagnostico}
          onValueChange={(value) => setFormData((current) => ({ ...current, diagnostico: value.slice(0, MAX_DIAGNOSIS_LENGTH) }))}
          maxLength={MAX_DIAGNOSIS_LENGTH}
          rows={2}
        />
        <TextareaField
          className="patient-form-tall-field"
          label="Tratamento médico"
          value={formData.tratamentoMedico}
          onValueChange={(value) => setFormData((current) => ({ ...current, tratamentoMedico: value.slice(0, MAX_TREATMENT_MEDICAL_LENGTH) }))}
          maxLength={MAX_TREATMENT_MEDICAL_LENGTH}
          rows={2}
        />
      </div>
    </>
  );
}
