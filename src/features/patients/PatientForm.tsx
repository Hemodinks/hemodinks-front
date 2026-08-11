import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect } from 'react';
import { FileText, FileUp, MessageSquareText, Plus, Save, Search, Trash2, X } from 'lucide-react';
import type { Convenio, Hospital, MedicalUserOption, OpmeFornecedor, Paciente, PacienteFormData } from '../../types';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, Button, CheckboxField, ComboboxField, FormPanel, IconButton, TextField, TextareaField } from '../../shared/components/ui';
import { SecureFileDownloadButton } from '../../shared/components/SecureFileDownloadButton';
import { downloadPacienteArquivo } from '../../services';
import {
  findConvenioByDescription,
  findHospitalByName,
  findMedicalUserByName,
  findOpmeFornecedorByName,
  formatCurrency,
  formatCurrencyInput,
  formatPersonName,
  MAX_DIAGNOSIS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_OBSERVATION_LENGTH,
  MAX_TREATMENT_MEDICAL_LENGTH,
} from '../../shared/utils/formatters';
import { getCalculatedPaymentValue } from './patientUtils';
import { usePatientFormExport } from './usePatientFormExport';

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

type MedicalTeamField = 'medico' | 'medicoAuxiliar1' | 'medicoAuxiliar2';

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
  isMedical,
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
  const { exportLoading, exportError, handleExport } = usePatientFormExport({
    editingPacienteId,
    sessionToken,
    pacienteFormData,
    companyName,
  });
  const estimatedValue = pacienteFormData.procedimentos.reduce(
    (total, procedimento) => total + (procedimento.valorReferencia ?? 0),
    0,
  );

  const isMedicalUserSelectedElsewhere = (field: MedicalTeamField, userId: number) => (
    Object.entries(medicalTeamFields).some(([currentField, config]) => (
      currentField !== field && pacienteFormData[config.idKey] === userId
    ))
  );

  const hasExportableFormData = pacienteFormData.nomePaciente.trim().length > 0
    && pacienteFormData.hospital.trim().length > 0
    && pacienteFormData.procedimentos.length > 0;

  const canExportForm = Boolean(editingPacienteId || hasExportableFormData);

  const updateMedicalTeamMember = (field: MedicalTeamField, value: string) => {
    const config = medicalTeamFields[field];
    const selectedUser = findMedicalUserByName(medicalUsers, value);

    setPacienteFormData((current) => ({
      ...current,
      [config.idKey]: selectedUser?.id ?? null,
      [config.nameKey]: selectedUser?.nome ?? '',
    }));
  };

  const getMedicalOptions = (field: MedicalTeamField) => medicalUsers
    .filter((user) => !isMedicalUserSelectedElsewhere(field, user.id))
    .map((user) => formatPersonName(user.nome));

  useEffect(() => {
    const calculatedPayment = getCalculatedPaymentValue(estimatedValue, pacienteFormData.repasseGlosa);
    setPacienteFormData((current) => current.pagamento === calculatedPayment
      ? current
      : { ...current, pagamento: calculatedPayment });
  }, [estimatedValue, pacienteFormData.repasseGlosa, setPacienteFormData]);

  return (
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{editingPacienteId ? formReadOnly ? 'Visualizacao' : 'Edicao' : 'Cadastro'}</span>
          <h2>{editingPacienteId ? formReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'}</h2>
        </div>
        <div className="panel-title-actions">
          <Button variant="ghost" className="patient-export-actions-button export-pdf-btn" type="button" disabled={!canExportForm || exportLoading != null} onClick={() => void handleExport('pdf')}>
            {exportLoading === 'pdf' ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
          <Button variant="ghost" className="patient-export-actions-button export-xlsx-btn" type="button" disabled={!canExportForm || exportLoading != null} onClick={() => void handleExport('xlsx')}>
            {exportLoading === 'xlsx' ? 'Gerando XLSX...' : 'Exportar XLSX'}
          </Button>
          <IconButton label="Voltar para lista" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
      </div>

      {exportError && <AlertMessage type="error">{exportError}</AlertMessage>}

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <fieldset className="form-fieldset" disabled={formReadOnly}>
          <DateInput
            id="patient-procedure-date"
            label="Data da Solicitação"
            value={pacienteFormData.data || ''}
            onChange={(value) => setPacienteFormData((current) => ({ ...current, data: value }))}
          />

          <DateInput
            id="patient-appointment-date"
            label="Data do Atendimento"
            value={pacienteFormData.dataAtendimento || ''}
            onChange={(value) => setPacienteFormData((current) => ({ ...current, dataAtendimento: value }))}
          />

          <TextField
            label="Paciente"
            type="text"
            value={pacienteFormData.nomePaciente}
            onValueChange={(value) => setPacienteFormData((current) => ({ ...current, nomePaciente: value.slice(0, MAX_NAME_LENGTH) }))}
            maxLength={MAX_NAME_LENGTH}
            required
          />

          <div className="two-column-fields">
            <TextareaField
              className="patient-form-tall-field"
              label="Diagnóstico"
              value={pacienteFormData.diagnostico}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, diagnostico: value.slice(0, MAX_DIAGNOSIS_LENGTH) }))}
              maxLength={MAX_DIAGNOSIS_LENGTH}
              rows={2}
            />

            <TextareaField
              className="patient-form-tall-field"
              label="Tratamento médico"
              value={pacienteFormData.tratamentoMedico}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, tratamentoMedico: value.slice(0, MAX_TREATMENT_MEDICAL_LENGTH) }))}
              maxLength={MAX_TREATMENT_MEDICAL_LENGTH}
              rows={2}
            />
          </div>

          <div className="patient-form-clinical-grid">
            <div className="patient-form-clinical-column">
              <div className="patient-form-slot">
                <ComboboxField
                  label="Convênio"
                  value={pacienteFormData.convenio}
                  options={convenios.map((convenio) => convenio.descricaoConvenio)}
                  onValueChange={(value) => {
                    const convenio = value.slice(0, MAX_NAME_LENGTH);
                    const selectedConvenio = findConvenioByDescription(convenios, convenio);
                    setPacienteFormData((current) => ({
                      ...current,
                      convenioId: selectedConvenio?.idConvenio ?? null,
                      convenio,
                    }));
                  }}
                  disabled={formReadOnly}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={convenios.length ? 'Selecione ou digite o convênio' : 'Digite o convênio'}
                  noOptionsLabel="Novo convênio: será cadastrado ao salvar."
                />
                {conveniosError && <AlertMessage type="error">{conveniosError}</AlertMessage>}
              </div>

              <div className="patient-form-slot">
                <ComboboxField
                  label="Hospital"
                  value={pacienteFormData.hospital}
                  options={hospitais.map((hospital) => hospital.nome)}
                  onValueChange={(value) => {
                    const hospital = value.slice(0, MAX_NAME_LENGTH);
                    const selectedHospital = findHospitalByName(hospitais, hospital);
                    setPacienteFormData((current) => ({
                      ...current,
                      hospitalId: selectedHospital?.id ?? null,
                      hospital,
                    }));
                  }}
                  disabled={formReadOnly}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={hospitais.length ? 'Selecione ou digite o hospital' : 'Digite o hospital'}
                  noOptionsLabel="Novo hospital: será cadastrado ao salvar."
                  required
                />
                {hospitaisError && <AlertMessage type="error">{hospitaisError}</AlertMessage>}
              </div>

              <div className="patient-form-slot">
                <ComboboxField
                  label="Fornecedor OPME"
                  value={pacienteFormData.opmeFornecedor}
                  options={opmeFornecedores.map((fornecedor) => fornecedor.fornecedor)}
                  onValueChange={(value) => {
                    const opmeFornecedor = value.slice(0, MAX_NAME_LENGTH);
                    const selectedFornecedor = findOpmeFornecedorByName(opmeFornecedores, opmeFornecedor);
                    setPacienteFormData((current) => ({
                      ...current,
                      opmeFornecedorId: selectedFornecedor?.idFornecedor ?? null,
                      opmeFornecedor,
                    }));
                  }}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={opmeFornecedores.length ? 'Selecione ou digite o fornecedor OPME' : 'Digite o fornecedor OPME'}
                  noOptionsLabel="Novo fornecedor: será cadastrado ao salvar."
                />
                {opmeFornecedoresError && <AlertMessage type="error">{opmeFornecedoresError}</AlertMessage>}
              </div>
            </div>

            <div className="patient-form-clinical-column">
              <div className="patient-form-slot">
                <ComboboxField
                  label="Cirurgião"
                  value={formatPersonName(pacienteFormData.medico)}
                  options={getMedicalOptions('medico')}
                  onValueChange={(value) => updateMedicalTeamMember('medico', value)}
                  disabled={formReadOnly || (!medicalUsers.length && !pacienteFormData.medico)}
                  placeholder={medicalUsers.length ? 'Digite para buscar um cirurgião' : 'Nenhum médico cadastrado'}
                />
              </div>

              <div className="patient-form-slot">
                <ComboboxField
                  label="Médico auxiliar 1"
                  value={formatPersonName(pacienteFormData.medicoAuxiliar1)}
                  options={getMedicalOptions('medicoAuxiliar1')}
                  onValueChange={(value) => updateMedicalTeamMember('medicoAuxiliar1', value)}
                  disabled={formReadOnly || (!medicalUsers.length && !pacienteFormData.medicoAuxiliar1)}
                  placeholder={medicalUsers.length ? 'Digite para buscar um médico auxiliar' : 'Nenhum médico cadastrado'}
                />
              </div>

              <div className="patient-form-slot">
                <ComboboxField
                  label="Médico auxiliar 2"
                  value={formatPersonName(pacienteFormData.medicoAuxiliar2)}
                  options={getMedicalOptions('medicoAuxiliar2')}
                  onValueChange={(value) => updateMedicalTeamMember('medicoAuxiliar2', value)}
                  disabled={formReadOnly || (!medicalUsers.length && !pacienteFormData.medicoAuxiliar2)}
                  placeholder={medicalUsers.length ? 'Digite para buscar um médico auxiliar' : 'Nenhum médico cadastrado'}
                />
              </div>
            </div>
          </div>

          <div className="procedure-field">
            <span className="field-label">Procedimento</span>
            <div className="procedure-selector">
              <Button className="procedure-select-button" onClick={onOpenCbhpmModal} disabled={formReadOnly}>
                <Search size={17} />
                Adicionar procedimento
              </Button>

              {pacienteFormData.procedimentos.length ? (
                <div className="selected-procedure-list">
                  {pacienteFormData.procedimentos.map((procedimento, index) => (
                    <div className="selected-procedure" key={`${procedimento.cbhpmCodigo || procedimento.procedimento}-${index}`}>
                      <div className="selected-procedure-main">
                        <span>{procedimento.cbhpmCodigo || 'Sem código'}</span>
                        <strong>{procedimento.procedimento}</strong>
                        {procedimento.valorReferencia != null && (
                          <small>Valor referência: {formatCurrency(procedimento.valorReferencia)}</small>
                        )}
                      </div>
                      <div className="selected-procedure-actions">
                        {procedimento.cbhpmPorte && <span className="status-pill active">{procedimento.cbhpmPorte}</span>}
                        {!formReadOnly && (
                          <IconButton label="Remover procedimento" tone="muted" className="mini" onClick={() => onRemovePacienteProcedimento(index)}>
                            <X size={14} />
                          </IconButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="file-hint">Nenhum procedimento selecionado.</span>
              )}
            </div>
          </div>

          <div className="two-column-fields">
            <TextField
              label="Autorização"
              type="text"
              value={pacienteFormData.autorizacao}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, autorizacao: value.slice(0, MAX_NAME_LENGTH) }))}
              maxLength={MAX_NAME_LENGTH}
            />

            <TextField
              label="Glosa"
              type="text"
              value={pacienteFormData.repasseGlosa}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, repasseGlosa: formatCurrencyInput(value) }))}
              inputMode="decimal"
              maxLength={24}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="two-column-fields">
            <TextField
              label="Valor estimado"
              type="text"
              value={formatCurrency(estimatedValue)}
              onValueChange={() => undefined}
              disabled
              aria-readonly="true"
            />

            <TextField
              label="Valor recebido/pago"
              type="text"
              value={pacienteFormData.pagamento}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, pagamento: formatCurrencyInput(value) }))}
              inputMode="decimal"
              onFocus={(event) => event.currentTarget.select()}
              maxLength={24}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="patient-observation-field">
            <div className="patient-observation-header">
              <span className="field-label">Observacoes</span>
              {editingPacienteId && onOpenPacienteObservacoes && (
                <Button className="patient-observation-action" onClick={onOpenPacienteObservacoes}>
                  <MessageSquareText size={16} />
                  Abrir conversa
                </Button>
              )}
            </div>
            <TextareaField
              label="Nova observação"
              value={pacienteFormData.novaObservacao}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, novaObservacao: value.slice(0, MAX_OBSERVATION_LENGTH) }))}
              maxLength={MAX_OBSERVATION_LENGTH}
              placeholder="Escreva uma observação para os envolvidos neste paciente."
              className="observation-textarea"
            />
            <span className="file-hint">{pacienteFormData.novaObservacao.length}/{MAX_OBSERVATION_LENGTH} caracteres</span>
          </div>

          <div className="profile-photo-field">
            <label className="field-label" htmlFor="patient-file-input">
              Arquivos
            </label>
            {!formReadOnly && canEditPatients && (
              <>
                <label className="ghost-button file-action full-width" htmlFor="patient-file-input">
                  <FileUp size={17} />
                  Selecionar arquivos
                </label>
                <input
                  key={patientFileInputKey}
                  id="patient-file-input"
                  className="sr-only"
                  type="file"
                  aria-label="Arquivos do paciente"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                  multiple
                  onChange={onPacienteFilesChange}
                />

                {pendingPatientFiles.length > 0 && (
                  <ul className="file-list">
                    {pendingPatientFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <FileText size={15} />
                        <span>{file.name}</span>
                        <IconButton label="Remover arquivo" tone="muted" className="mini" onClick={() => onRemovePendingPatientFile(index)}>
                          <X size={14} />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {editingPaciente?.arquivos.length ? (
              <ul className="file-list">
                {editingPaciente.arquivos.map((arquivo) => (
                  <li key={arquivo.id}>
                    <FileText size={15} />
                    <SecureFileDownloadButton
                      fileName={arquivo.nomeOriginal}
                      label={arquivo.nomeOriginal}
                      loadFile={() => downloadPacienteArquivo(editingPaciente.id, arquivo.id, sessionToken)}
                    />
                    {!formReadOnly && canEditPatients && (
                      <IconButton label="Excluir arquivo" tone="muted" className="mini" onClick={() => void onDeletePacienteArquivo(editingPaciente, arquivo.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <CheckboxField
            label="Status Pago"
            checked={pacienteFormData.statusPago}
            onCheckedChange={(checked) => setPacienteFormData((current) => ({ ...current, statusPago: checked }))}
          />

          <CheckboxField
            label="Paciente ativo"
            checked={pacienteFormData.ativo}
            onCheckedChange={(checked) => setPacienteFormData((current) => ({ ...current, ativo: checked }))}
          />
        </fieldset>

        {pacienteFormError && <AlertMessage type="error">{pacienteFormError}</AlertMessage>}

        {canSubmitForm && (
          <Button variant="primary" type="submit" disabled={pacienteFormLoading}>
            {editingPacienteId ? <Save size={18} /> : <Plus size={18} />}
            {pacienteFormLoading ? 'Salvando...' : editingPacienteId ? 'Salvar paciente' : 'Cadastrar paciente'}
          </Button>
        )}
      </form>
    </FormPanel>
  );
}
