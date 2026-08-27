import type { Dispatch, SetStateAction } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { PacienteFormData } from '../../../types';
import { Button, TextareaField } from '../../../shared/components/ui';
import { MAX_OBSERVATION_LENGTH } from '../../../shared/utils/formatters';

type Props = {
  editingPacienteId: number | null;
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
  onOpen?: () => void;
};

export function PatientObservationsSection({ editingPacienteId, formData, setFormData, onOpen }: Props) {
  return (
    <div className="patient-observation-field">
      <div className="patient-observation-header">
        <span className="field-label">Observacoes</span>
        {editingPacienteId && onOpen && <Button className="patient-observation-action" onClick={onOpen}><MessageSquareText size={16} />Abrir conversa</Button>}
      </div>
      <TextareaField
        label="Nova observação"
        value={formData.novaObservacao}
        onValueChange={(value) => setFormData((current) => ({ ...current, novaObservacao: value.slice(0, MAX_OBSERVATION_LENGTH) }))}
        maxLength={MAX_OBSERVATION_LENGTH}
        placeholder="Escreva uma observação para os envolvidos neste paciente."
        className="observation-textarea"
      />
      <span className="file-hint">{formData.novaObservacao.length}/{MAX_OBSERVATION_LENGTH} caracteres</span>
    </div>
  );
}
