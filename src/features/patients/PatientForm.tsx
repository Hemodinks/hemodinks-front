import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FileText, FileUp, MessageSquareText, Plus, Save, Search, Trash2, X } from 'lucide-react';
import type { Convenio, Hospital, MedicalUserOption, OpmeFornecedor, Paciente, PacienteFormData } from '../../types';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, Button, CheckboxField, FormPanel, IconButton, SelectField, TextField, TextareaField } from '../../shared/components/ui';
import {
  CONVENIOS_DATALIST_ID,
  DEFAULT_PASSWORD,
  findConvenioByDescription,
  findHospitalByName,
  findOpmeFornecedorByName,
  formatCurrency,
  formatCurrencyInput,
  HOSPITAIS_DATALIST_ID,
  MAX_DIAGNOSIS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_OBSERVATION_LENGTH,
  MAX_TREATMENT_MEDICAL_LENGTH,
  OPME_FORNECEDORES_DATALIST_ID,
} from '../../shared/utils/formatters';

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
  hospitais,
  hospitaisError,
  medicalUsers,
  convenios,
  conveniosError,
  opmeFornecedores,
  opmeFornecedoresError,
  isMedical,
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

  const getLegacyMedicalOption = (field: MedicalTeamField) => {
    const config = medicalTeamFields[field];
    const userId = pacienteFormData[config.idKey];
    const legacyName = pacienteFormData[config.nameKey].trim();

    if (!legacyName) {
      return null;
    }

    if (userId != null && medicalUsers.some((user) => user.id === userId)) {
      return null;
    }

    return {
      value: userId != null ? `legacy:${userId}` : 'legacy',
      label: userId != null
        ? `${legacyName} (fora da sua lista)`
        : `${legacyName} (fora do cadastro)`,
    };
  };

  const getMedicalSelectValue = (field: MedicalTeamField) => {
    const config = medicalTeamFields[field];
    const userId = pacienteFormData[config.idKey];
    const legacyOption = getLegacyMedicalOption(field);

    if (userId != null && !legacyOption) {
      return String(userId);
    }

    return legacyOption?.value ?? '';
  };

  const isMedicalUserSelectedElsewhere = (field: MedicalTeamField, userId: number) => (
    Object.entries(medicalTeamFields).some(([currentField, config]) => (
      currentField !== field && pacienteFormData[config.idKey] === userId
    ))
  );

  const updateMedicalTeamMember = (field: MedicalTeamField, value: string) => {
    const config = medicalTeamFields[field];
    const userId = value && !value.startsWith('legacy') ? Number(value) : null;
    const selectedUser = userId != null ? medicalUsers.find((user) => user.id === userId) : undefined;

    setPacienteFormData((current) => ({
      ...current,
      [config.idKey]: selectedUser?.id ?? null,
      [config.nameKey]: selectedUser?.nome ?? '',
    }));
  };

  const renderMedicalOptions = (field: MedicalTeamField, emptyLabel: string) => {
    const legacyOption = getLegacyMedicalOption(field);

    return (
      <>
        <option value="">{emptyLabel}</option>
        {legacyOption && (
          <option value={legacyOption.value}>{legacyOption.label}</option>
        )}
        {medicalUsers.map((user) => (
          <option key={user.id} value={user.id} disabled={isMedicalUserSelectedElsewhere(field, user.id)}>
            {user.nome}
          </option>
        ))}
      </>
    );
  };

  return (
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{editingPacienteId ? formReadOnly ? 'Visualizacao' : 'Edicao' : 'Cadastro'}</span>
          <h2>{editingPacienteId ? formReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'}</h2>
        </div>
        <div className="panel-title-actions">
          {!editingPacienteId && <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>}
          <IconButton label="Voltar para lista" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
      </div>

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <fieldset className="form-fieldset" disabled={formReadOnly}>
          <DateInput
            id="patient-procedure-date"
            label="Data procedimento"
            value={pacienteFormData.data || ''}
            onChange={(value) => setPacienteFormData((current) => ({ ...current, data: value }))}
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
            <datalist id={HOSPITAIS_DATALIST_ID}>
              {hospitais.map((hospital) => (
                <option key={hospital.id} value={hospital.nome} />
              ))}
            </datalist>

            <div className="patient-form-clinical-column">
              <div className="patient-form-slot">
                <TextField
                  label="Convênio"
                  type="text"
                  list={CONVENIOS_DATALIST_ID}
                  value={pacienteFormData.convenio}
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
                  placeholder={convenios.length ? 'Selecione ou digite o convenio' : 'Digite o convenio'}
                />
                {conveniosError && <AlertMessage type="error">{conveniosError}</AlertMessage>}
              </div>

              <div className="patient-form-slot">
                <TextField
                  label="Hospital"
                  type="text"
                  list={HOSPITAIS_DATALIST_ID}
                  value={pacienteFormData.hospital}
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
                  required
                />
                {hospitaisError && <AlertMessage type="error">{hospitaisError}</AlertMessage>}
              </div>

              <div className="patient-form-slot">
                <TextField
                  label="Fornecedor OPME"
                  type="text"
                  list={OPME_FORNECEDORES_DATALIST_ID}
                  value={pacienteFormData.opmeFornecedor}
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
                />
                {opmeFornecedoresError && <AlertMessage type="error">{opmeFornecedoresError}</AlertMessage>}
              </div>
            </div>

            <div className="patient-form-clinical-column">
              <div className="patient-form-slot">
                <SelectField
                  label="Cirurgião"
                  value={getMedicalSelectValue('medico')}
                  onChange={(event) => updateMedicalTeamMember('medico', event.target.value)}
                  disabled={formReadOnly || (!medicalUsers.length && !pacienteFormData.medico)}
                >
                  {renderMedicalOptions('medico', medicalUsers.length ? 'Selecione um cirurgiao' : 'Nenhum medico cadastrado')}
                </SelectField>
              </div>

              <div className="patient-form-slot">
                <SelectField
                  label="Médico auxiliar 1"
                  value={getMedicalSelectValue('medicoAuxiliar1')}
                  onChange={(event) => updateMedicalTeamMember('medicoAuxiliar1', event.target.value)}
                  disabled={formReadOnly || (!medicalUsers.length && !pacienteFormData.medicoAuxiliar1)}
                >
                  {renderMedicalOptions('medicoAuxiliar1', medicalUsers.length ? 'Selecione um medico auxiliar' : 'Nenhum medico cadastrado')}
                </SelectField>
              </div>

              <div className="patient-form-slot">
                <SelectField
                  label="Médico auxiliar 2"
                  value={getMedicalSelectValue('medicoAuxiliar2')}
                  onChange={(event) => updateMedicalTeamMember('medicoAuxiliar2', event.target.value)}
                  disabled={formReadOnly || (!medicalUsers.length && !pacienteFormData.medicoAuxiliar2)}
                >
                  {renderMedicalOptions('medicoAuxiliar2', medicalUsers.length ? 'Selecione um medico auxiliar' : 'Nenhum medico cadastrado')}
                </SelectField>
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
                        <span>{procedimento.cbhpmCodigo || 'Sem codigo'}</span>
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

          <TextField
            label="Autorizacao"
            type="text"
            value={pacienteFormData.autorizacao}
            onValueChange={(value) => setPacienteFormData((current) => ({ ...current, autorizacao: value.slice(0, MAX_NAME_LENGTH) }))}
            maxLength={MAX_NAME_LENGTH}
          />

          <div className="two-column-fields">
            <TextField
              label="Valor recebido/pago"
              type="text"
              value={pacienteFormData.pagamento}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, pagamento: formatCurrencyInput(value) }))}
              inputMode="numeric"
              maxLength={24}
              placeholder="R$ 0,00"
            />

            <TextField
              label="Glosa"
              type="text"
              value={pacienteFormData.repasseGlosa}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, repasseGlosa: formatCurrencyInput(value) }))}
              inputMode="numeric"
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
              label="Nova observacao"
              value={pacienteFormData.novaObservacao}
              onValueChange={(value) => setPacienteFormData((current) => ({ ...current, novaObservacao: value.slice(0, MAX_OBSERVATION_LENGTH) }))}
              maxLength={MAX_OBSERVATION_LENGTH}
              placeholder="Escreva uma observacao para os envolvidos neste paciente."
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
                    <a href={arquivo.url} target="_blank" rel="noreferrer">{arquivo.nomeOriginal}</a>
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
