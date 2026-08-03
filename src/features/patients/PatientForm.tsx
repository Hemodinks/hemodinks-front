import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Plus, Save, X } from 'lucide-react';
import type {
  Convenio,
  Hospital,
  OpmeFornecedor,
  Paciente,
  PacienteFormData,
} from './patientTypes';
import type { MedicalUserOption } from '../../shared/domain/clinicalContracts';
import { DateInput } from '../../shared/components/DateInput';
import {
  AlertMessage,
  Button,
  CheckboxField,
  FormPanel,
  IconButton,
  TextField,
} from '../../shared/components/ui';
import { formatPhoneInput, MAX_NAME_LENGTH } from '../../shared/utils/formatters';

type PatientFormProps = {
  canEditPatients: boolean;
  editingPacienteId: number | null;
  editingPaciente: Paciente | null;
  patientReadOnly: boolean;
  pacienteFormData: PacienteFormData;
  pacienteFormError: string;
  pacienteFormLoading: boolean;
  pendingPatientFiles: File[];
  patientFileInputKey: number;
  sessionToken: string;
  hospitais: Hospital[];
  hospitaisError: string;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  conveniosError: string;
  opmeFornecedores: OpmeFornecedor[];
  opmeFornecedoresError: string;
  isMedical: boolean;
  setPacienteFormData: Dispatch<SetStateAction<PacienteFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenCbhpmModal: () => void;
  onRemovePacienteProcedimento: (index: number) => void;
  onPacienteFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePendingPatientFile: (index: number) => void;
  onDeletePacienteArquivo: (paciente: Paciente, arquivoId: number) => void | Promise<void>;
  onOpenPacienteObservacoes?: () => void;
};

export function PatientForm(props: PatientFormProps) {
  const {
    canEditPatients,
    editingPacienteId,
    patientReadOnly,
    pacienteFormData,
    pacienteFormError,
    pacienteFormLoading,
    setPacienteFormData,
    onClose,
    onSubmit,
  } = props;
  const formReadOnly = patientReadOnly || (editingPacienteId ? !canEditPatients : false);
  const canSubmitForm = !formReadOnly && (!editingPacienteId || canEditPatients);

  return (
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">Cadastro do paciente</span>
          <h2>
            {editingPacienteId
              ? formReadOnly
                ? 'Visualizar paciente'
                : 'Editar paciente'
              : 'Novo paciente'}
          </h2>
          <p>
            Dados clínicos, procedimentos e valores são registrados no atendimento, faturamento e
            financeiro.
          </p>
        </div>
        <IconButton label="Voltar para lista" tone="muted" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <fieldset className="form-fieldset" disabled={formReadOnly}>
          <TextField
            label="Nome completo"
            value={pacienteFormData.nomePaciente}
            onValueChange={(value) =>
              setPacienteFormData((current) => ({
                ...current,
                nomePaciente: value.slice(0, MAX_NAME_LENGTH),
              }))
            }
            maxLength={MAX_NAME_LENGTH}
            required
          />
          <DateInput
            id="patient-birth-date"
            label="Data de nascimento"
            value={pacienteFormData.dataNascimento}
            onChange={(value) =>
              setPacienteFormData((current) => ({
                ...current,
                dataNascimento: value,
              }))
            }
          />
          <div className="two-column-fields">
            <TextField
              label="E-mail de acesso"
              type="email"
              value={pacienteFormData.email}
              onValueChange={(value) =>
                setPacienteFormData((current) => ({ ...current, email: value }))
              }
            />
            <TextField
              label="Telefone"
              value={pacienteFormData.telefone}
              onValueChange={(value) =>
                setPacienteFormData((current) => ({
                  ...current,
                  telefone: formatPhoneInput(value),
                }))
              }
              inputMode="tel"
            />
          </div>

          <CheckboxField
            label="Paciente ativo"
            checked={pacienteFormData.ativo}
            onCheckedChange={(checked) =>
              setPacienteFormData((current) => ({ ...current, ativo: checked }))
            }
          />
        </fieldset>
        {pacienteFormError && <AlertMessage type="error">{pacienteFormError}</AlertMessage>}
        {canSubmitForm && (
          <Button variant="primary" type="submit" disabled={pacienteFormLoading}>
            {editingPacienteId ? <Save size={18} /> : <Plus size={18} />}
            {pacienteFormLoading
              ? 'Salvando...'
              : editingPacienteId
                ? 'Salvar paciente'
                : 'Cadastrar paciente'}
          </Button>
        )}
      </form>
    </FormPanel>
  );
}
