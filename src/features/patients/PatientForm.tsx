import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect } from 'react';
import { FileDown, Plus, Save, X } from 'lucide-react';
import type { Convenio, Hospital, MedicalUserOption, OpmeFornecedor, Paciente, PacienteFormData } from '../../types';
import { AlertMessage, Button, FormPanel, IconButton } from '../../shared/components/ui';
import { findMedicalUserByName, formatPersonName } from '../../shared/utils/formatters';
import { focusFirstInvalidFormField } from '../../shared/utils/focusInvalidFormField';
import { getCalculatedGlosaValue } from './patientUtils';
import { usePatientFormExport } from './usePatientFormExport';
import { PatientIdentificationSection } from './form/PatientIdentificationSection';
import { PatientClinicalSection, type MedicalTeamField } from './form/PatientClinicalSection';
import { PatientProceduresSection } from './form/PatientProceduresSection';
import { PatientFinancialSection } from './form/PatientFinancialSection';
import { PatientAdditionalInfoSection } from './form/PatientAdditionalInfoSection';
import { PatientFormSection } from './form/PatientFormSection';
import { PatientFilesSection } from './form/PatientFilesSection';

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
  companyName: string;
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

const medicalTeamFields = {
  medico: { idKey: 'medicoUserId', nameKey: 'medico' },
  medicoAuxiliar1: { idKey: 'medicoAuxiliar1UserId', nameKey: 'medicoAuxiliar1' },
  medicoAuxiliar2: { idKey: 'medicoAuxiliar2UserId', nameKey: 'medicoAuxiliar2' },
} as const;

export function PatientForm({
  canEditPatients,
  editingPacienteId,
  editingPaciente,
  patientReadOnly,
  pacienteFormData,
  pacienteFormError,
  pacienteFormLoading,
  pendingPatientFiles,
  patientFileInputKey,
  sessionToken,
  hospitais,
  hospitaisError,
  medicalUsers,
  convenios,
  conveniosError,
  opmeFornecedores,
  opmeFornecedoresError,
  companyName,
  setPacienteFormData,
  onClose,
  onSubmit,
  onOpenCbhpmModal,
  onRemovePacienteProcedimento,
  onPacienteFilesChange,
  onRemovePendingPatientFile,
  onDeletePacienteArquivo,
  onOpenPacienteObservacoes,
}: PatientFormProps) {
  const formReadOnly = patientReadOnly || (editingPacienteId ? !canEditPatients : false);
  const canSubmitForm = !formReadOnly && (!editingPacienteId || canEditPatients);
  const { exportLoading, exportError, handleExport } = usePatientFormExport({ editingPacienteId, sessionToken, pacienteFormData, companyName });
  const estimatedValue = pacienteFormData.procedimentos.reduce((total, procedimento) => total + (procedimento.valorReferencia ?? 0), 0);
  const hasExportableFormData = pacienteFormData.nomePaciente.trim().length > 0
    && pacienteFormData.hospital.trim().length > 0
    && pacienteFormData.procedimentos.length > 0;
  const canExportForm = Boolean(editingPacienteId || hasExportableFormData);

  const isMedicalUserSelectedElsewhere = (field: MedicalTeamField, userId: number) => (
    Object.entries(medicalTeamFields).some(([currentField, config]) => currentField !== field && pacienteFormData[config.idKey] === userId)
  );
  const getMedicalOptions = (field: MedicalTeamField) => medicalUsers
    .filter((user) => !isMedicalUserSelectedElsewhere(field, user.id))
    .map((user) => formatPersonName(user.nome));
  const updateMedicalTeamMember = (field: MedicalTeamField, value: string) => {
    const config = medicalTeamFields[field];
    const selectedUser = findMedicalUserByName(medicalUsers, value);
    setPacienteFormData((current) => ({ ...current, [config.idKey]: selectedUser?.id ?? null, [config.nameKey]: selectedUser?.nome ?? '' }));
  };

  useEffect(() => {
    const calculatedGlosa = getCalculatedGlosaValue(estimatedValue, pacienteFormData.pagamento);
    setPacienteFormData((current) => current.repasseGlosa === calculatedGlosa ? current : { ...current, repasseGlosa: calculatedGlosa });
  }, [estimatedValue, pacienteFormData.pagamento, setPacienteFormData]);

  return (
    <FormPanel className="module-form-panel patient-form-panel" data-tour="patients-form" role="region" aria-label="Ficha do paciente">
      <div className="panel-title patient-form-header">
        <div>
          <span className="eyebrow">{editingPacienteId ? formReadOnly ? 'Visualização · Ficha do paciente' : 'Edição · Ficha do paciente' : 'Cadastro · Ficha do paciente'}</span>
          <h2>{editingPacienteId ? formReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'}</h2>
          {editingPaciente && <p className="patient-form-patient-name">{formatPersonName(editingPaciente.nomePaciente)}</p>}
        </div>
        <div className="panel-title-actions">
          <div className="patient-form-exports" role="group" aria-label="Exportar ficha individual">
            <Button variant="ghost" className="export-pdf-btn" disabled={!canExportForm || exportLoading != null} onClick={() => void handleExport('pdf')}><FileDown size={16} aria-hidden="true" />{exportLoading === 'pdf' ? 'Gerando PDF...' : 'Exportar ficha PDF'}</Button>
            <Button variant="ghost" className="export-xlsx-btn" disabled={!canExportForm || exportLoading != null} onClick={() => void handleExport('xlsx')}><FileDown size={16} aria-hidden="true" />{exportLoading === 'xlsx' ? 'Gerando planilha...' : 'Exportar ficha Excel'}</Button>
          </div>
          <IconButton label="Voltar para lista" tone="muted" onClick={onClose} disabled={pacienteFormLoading}><X size={18} /></IconButton>
        </div>
      </div>
      {exportError && <AlertMessage type="error">{exportError}</AlertMessage>}
      <p className="patient-form-guidance">{formReadOnly ? 'Ficha disponível somente para consulta.' : 'Preencha o paciente, o hospital e pelo menos um procedimento. Os demais campos são opcionais.'}</p>
      <form className="stack patient-form-layout" onSubmit={onSubmit} onInvalid={focusFirstInvalidFormField} aria-busy={pacienteFormLoading}>
        <fieldset className="form-fieldset patient-form-fields" disabled={formReadOnly || pacienteFormLoading} data-tour="patients-identification">
          <legend className="sr-only">Dados da ficha do paciente</legend>
          <PatientFormSection title="Dados principais">
            <PatientIdentificationSection formData={pacienteFormData} setFormData={setPacienteFormData} />
          </PatientFormSection>
          <PatientClinicalSection
            formData={pacienteFormData}
            setFormData={setPacienteFormData}
            formReadOnly={formReadOnly}
            hospitais={hospitais}
            hospitaisError={hospitaisError}
            convenios={convenios}
            conveniosError={conveniosError}
            opmeFornecedores={opmeFornecedores}
            opmeFornecedoresError={opmeFornecedoresError}
            medicalUsersAvailable={medicalUsers.length > 0}
            getMedicalOptions={getMedicalOptions}
            updateMedicalTeamMember={updateMedicalTeamMember}
          />
          <PatientFormSection title="Procedimentos">
            <PatientProceduresSection procedimentos={pacienteFormData.procedimentos} formReadOnly={formReadOnly} onOpen={onOpenCbhpmModal} onRemove={onRemovePacienteProcedimento} />
          </PatientFormSection>
          <PatientFormSection title="Financeiro">
            <PatientFinancialSection formData={pacienteFormData} setFormData={setPacienteFormData} estimatedValue={estimatedValue} />
          </PatientFormSection>
          <PatientFormSection title="Informações complementares">
            <PatientAdditionalInfoSection editingPacienteId={editingPacienteId} formData={pacienteFormData} setFormData={setPacienteFormData} onOpen={onOpenPacienteObservacoes} />
          </PatientFormSection>
          <PatientFormSection title="Arquivos" description="Anexe documentos de até 10 MB cada. Os arquivos selecionados são enviados ao salvar o paciente.">
            <PatientFilesSection
              formReadOnly={formReadOnly}
              canEditPatients={canEditPatients}
              editingPaciente={editingPaciente}
              pendingFiles={pendingPatientFiles}
              inputKey={patientFileInputKey}
              sessionToken={sessionToken}
              onFilesChange={onPacienteFilesChange}
              onRemovePending={onRemovePendingPatientFile}
              onDelete={onDeletePacienteArquivo}
            />
          </PatientFormSection>
        </fieldset>
        {pacienteFormError && <AlertMessage type="error">{pacienteFormError}</AlertMessage>}
        <div className="patient-form-actions">
          <Button onClick={onClose} disabled={pacienteFormLoading}>{formReadOnly ? 'Voltar à listagem' : 'Cancelar'}</Button>
          {canSubmitForm && <Button variant="primary" type="submit" disabled={pacienteFormLoading} data-tour="patients-save">{editingPacienteId ? <Save size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}{pacienteFormLoading ? 'Salvando...' : editingPacienteId ? 'Salvar alterações' : 'Cadastrar paciente'}</Button>}
        </div>
      </form>
    </FormPanel>
  );
}
