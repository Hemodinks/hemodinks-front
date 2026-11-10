import type { Dispatch, SetStateAction } from 'react';
import type { PacienteFormData } from '../../../types';
import { DateInput } from '../../../shared/components/DateInput';
import { TextField } from '../../../shared/components/ui';
import { isValidDate, MAX_NAME_LENGTH } from '../../../shared/utils/formatters';
import { getSurgeryStatusLabel, type StatusCirurgia } from '../../../shared/surgeryStatus';
import { getPatientChronologyError } from '../patientUtils';
import { getConsolidationYearError } from '../../../shared/utils/consolidationDate';

type Props = {
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
};

export function PatientIdentificationSection({ formData, setFormData }: Props) {
  // Só uma data válida é enviada à API; o indicador segue a mesma regra.
  const status: StatusCirurgia = formData.dataAtendimento && isValidDate(formData.dataAtendimento) ? 'Consolidada' : 'NaoConsolidada';
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
        min={formData.data && isValidDate(formData.data) ? formData.data : undefined}
        error={getPatientChronologyError(formData) || getConsolidationYearError(formData.dataAtendimento, formData.dataAtendimentoOriginal)}
        value={formData.dataAtendimento || ''}
        onChange={(value) => setFormData((current) => ({ ...current, dataAtendimento: value }))}
      />
      <p className="surgery-status-indicator" role="status" aria-live="polite">
        <span>Status da cirurgia</span>
        <span className={`status-pill ${status === 'Consolidada' ? 'ok' : 'warning'}`}>{getSurgeryStatusLabel(status)}</span>
      </p>
    </>
  );
}
