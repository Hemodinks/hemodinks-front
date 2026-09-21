import type { Dispatch, SetStateAction } from 'react';
import type { PacienteFormData } from '../../../types';
import { TextareaField } from '../../../shared/components/ui';
import { MAX_DIAGNOSIS_LENGTH, MAX_TREATMENT_MEDICAL_LENGTH } from '../../../shared/utils/formatters';
import { PatientObservationsSection } from './PatientObservationsSection';

type Props = {
  editingPacienteId: number | null;
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
  onOpen?: () => void;
};

export function PatientAdditionalInfoSection({ editingPacienteId, formData, setFormData, onOpen }: Props) {
  return <>
    <TextareaField
      className="patient-form-tall-field"
      label="Informações Adicionais"
      value={formData.diagnostico}
      onValueChange={(value) => setFormData((current) => ({ ...current, diagnostico: value.slice(0, MAX_DIAGNOSIS_LENGTH) }))}
      maxLength={MAX_DIAGNOSIS_LENGTH}
      rows={3}
    />
    <TextareaField
      className="patient-form-tall-field"
      label="Tratamento médico"
      value={formData.tratamentoMedico}
      onValueChange={(value) => setFormData((current) => ({ ...current, tratamentoMedico: value.slice(0, MAX_TREATMENT_MEDICAL_LENGTH) }))}
      maxLength={MAX_TREATMENT_MEDICAL_LENGTH}
      rows={3}
    />
    <PatientObservationsSection editingPacienteId={editingPacienteId} formData={formData} setFormData={setFormData} onOpen={onOpen} />
  </>;
}
