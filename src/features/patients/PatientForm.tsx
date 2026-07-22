import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FileText, FileUp, MessageSquareText, Plus, Save, Trash2, X } from 'lucide-react';
import type { Convenio, Hospital, MedicalUserOption, OpmeFornecedor, Paciente, PacienteFormData } from '../../types';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, Button, CheckboxField, FormPanel, IconButton, TextField, TextareaField } from '../../shared/components/ui';
import { SecureFileDownloadButton } from '../../shared/components/SecureFileDownloadButton';
import { downloadPacienteArquivo } from '../../services';
import { formatCpfInput, formatPhoneInput, MAX_NAME_LENGTH, MAX_OBSERVATION_LENGTH } from '../../shared/utils/formatters';

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
    canEditPatients, editingPacienteId, editingPaciente, patientReadOnly, pacienteFormData,
    pacienteFormError, pacienteFormLoading, pendingPatientFiles, patientFileInputKey, sessionToken,
    setPacienteFormData, onClose, onSubmit, onPacienteFilesChange, onRemovePendingPatientFile,
    onDeletePacienteArquivo, onOpenPacienteObservacoes,
  } = props;
  const formReadOnly = patientReadOnly || (editingPacienteId ? !canEditPatients : false);
  const canSubmitForm = !formReadOnly && (!editingPacienteId || canEditPatients);

  return (
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">Cadastro do paciente</span>
          <h2>{editingPacienteId ? formReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'}</h2>
          <p>Dados clínicos, procedimentos e valores são registrados no atendimento, faturamento e financeiro.</p>
        </div>
        <IconButton label="Voltar para lista" tone="muted" onClick={onClose}><X size={18} /></IconButton>
      </div>

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <fieldset className="form-fieldset" disabled={formReadOnly}>
          <TextField label="Nome completo" value={pacienteFormData.nomePaciente}
            onValueChange={(value) => setPacienteFormData((current) => ({ ...current, nomePaciente: value.slice(0, MAX_NAME_LENGTH) }))}
            maxLength={MAX_NAME_LENGTH} required />
          <div className="two-column-fields">
            <TextField label="CPF" value={pacienteFormData.cpf}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, cpf: formatCpfInput(value) }))}
              inputMode="numeric" autoComplete="off" />
            <DateInput id="patient-birth-date" label="Data de nascimento" value={pacienteFormData.dataNascimento}
              onChange={(value) => setPacienteFormData((current) => ({ ...current, dataNascimento: value }))} />
          </div>
          <div className="two-column-fields">
            <TextField label="E-mail de acesso" type="email" value={pacienteFormData.email}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, email: value }))} />
            <TextField label="Telefone" value={pacienteFormData.telefone}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, telefone: formatPhoneInput(value) }))}
              inputMode="tel" />
          </div>

          <div className="patient-observation-field">
            <div className="patient-observation-header">
              <span className="field-label">Observações cadastrais</span>
              {editingPacienteId && onOpenPacienteObservacoes && (
                <Button className="patient-observation-action" onClick={onOpenPacienteObservacoes}>
                  <MessageSquareText size={16} /> Abrir conversa
                </Button>
              )}
            </div>
            <TextareaField label="Nova observação" value={pacienteFormData.novaObservacao}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, novaObservacao: value.slice(0, MAX_OBSERVATION_LENGTH) }))}
              maxLength={MAX_OBSERVATION_LENGTH} className="observation-textarea" />
          </div>

          <div className="profile-photo-field">
            <label className="field-label" htmlFor="patient-file-input">Arquivos</label>
            {!formReadOnly && canEditPatients && <>
              <label className="ghost-button file-action full-width" htmlFor="patient-file-input"><FileUp size={17} /> Selecionar arquivos</label>
              <input key={patientFileInputKey} id="patient-file-input" className="sr-only" type="file" multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.csv,.ppt,.pptx" onChange={onPacienteFilesChange} />
              {pendingPatientFiles.length > 0 && <ul className="file-list">
                {pendingPatientFiles.map((file, index) => <li key={`${file.name}-${index}`}>
                  <FileText size={15} /><span>{file.name}</span>
                  <IconButton label="Remover arquivo" tone="muted" className="mini" onClick={() => onRemovePendingPatientFile(index)}><X size={14} /></IconButton>
                </li>)}
              </ul>}
            </>}
            {editingPaciente?.arquivos.length ? <ul className="file-list">
              {editingPaciente.arquivos.map((arquivo) => <li key={arquivo.id}>
                <FileText size={15} />
                <SecureFileDownloadButton fileName={arquivo.nomeOriginal} label={arquivo.nomeOriginal}
                  loadFile={() => downloadPacienteArquivo(editingPaciente.id, arquivo.id, sessionToken)} />
                {!formReadOnly && canEditPatients && <IconButton label="Excluir arquivo" tone="muted" className="mini"
                  onClick={() => void onDeletePacienteArquivo(editingPaciente, arquivo.id)}><Trash2 size={14} /></IconButton>}
              </li>)}
            </ul> : null}
          </div>

          <CheckboxField label="Paciente ativo" checked={pacienteFormData.ativo}
            onCheckedChange={(checked) => setPacienteFormData((current) => ({ ...current, ativo: checked }))} />
        </fieldset>
        {pacienteFormError && <AlertMessage type="error">{pacienteFormError}</AlertMessage>}
        {canSubmitForm && <Button variant="primary" type="submit" disabled={pacienteFormLoading}>
          {editingPacienteId ? <Save size={18} /> : <Plus size={18} />}
          {pacienteFormLoading ? 'Salvando...' : editingPacienteId ? 'Salvar paciente' : 'Cadastrar paciente'}
        </Button>}
      </form>
    </FormPanel>
  );
}
