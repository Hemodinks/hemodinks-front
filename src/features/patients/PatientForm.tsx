import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FileText, FileUp, Plus, Save, Search, Trash2, X } from 'lucide-react';
import type { Convenio, Hospital, Paciente, PacienteFormData, User } from '../../types';
import { DateInput } from '../../shared/components/DateInput';
import {
  CONVENIOS_DATALIST_ID,
  DEFAULT_PASSWORD,
  findConvenioByDescription,
  findMedicalUserByName,
  formatCpfInput,
  formatCurrency,
  formatCurrencyInput,
  formatPhoneInput,
  MAX_CPF_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MEDICAL_USERS_DATALIST_ID,
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
  medicalUsers: User[];
  convenios: Convenio[];
  conveniosError: string;
  isMedical: boolean;
  sessionUserName: string;
  setPacienteFormData: Dispatch<SetStateAction<PacienteFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenCbhpmModal: () => void;
  onRemovePacienteProcedimento: (index: number) => void;
  onPacienteFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePendingPatientFile: (index: number) => void;
  onDeletePacienteArquivo: (paciente: Paciente, arquivoId: number) => void | Promise<void>;
};

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
  isMedical,
  sessionUserName,
  setPacienteFormData,
  onClose,
  onSubmit,
  onOpenCbhpmModal,
  onRemovePacienteProcedimento,
  onPacienteFilesChange,
  onRemovePendingPatientFile,
  onDeletePacienteArquivo,
}: PatientFormProps) {
  return (
    <aside className="form-panel module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{editingPacienteId ? patientReadOnly ? 'Visualizacao' : 'Edicao' : 'Cadastro'}</span>
          <h2>{editingPacienteId ? patientReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'}</h2>
        </div>
        <div className="panel-title-actions">
          {!editingPacienteId && <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>}
          <button type="button" className="icon-button muted" onClick={onClose} title="Voltar para lista">
            <X size={18} />
          </button>
        </div>
      </div>

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <fieldset className="form-fieldset" disabled={patientReadOnly}>
          <DateInput
            id="patient-procedure-date"
            label="Data procedimento"
            value={pacienteFormData.data || ''}
            onChange={(value) => setPacienteFormData((current) => ({ ...current, data: value }))}
          />

          <label>
            Paciente
            <input
              type="text"
              value={pacienteFormData.nomePaciente}
              onChange={(event) => setPacienteFormData((current) => ({ ...current, nomePaciente: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
              maxLength={MAX_NAME_LENGTH}
              required
            />
          </label>

          <label>
            CPF
            <input
              type="text"
              value={pacienteFormData.cpf}
              onChange={(event) => setPacienteFormData((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))}
              inputMode="numeric"
              maxLength={MAX_CPF_LENGTH}
              placeholder="000.000.000-00"
              required
            />
          </label>

          <label>
            Telefone
            <input
              type="tel"
              value={pacienteFormData.telefone}
              onFocus={() => setPacienteFormData((current) => ({ ...current, telefone: formatPhoneInput(current.telefone) }))}
              onChange={(event) => setPacienteFormData((current) => ({ ...current, telefone: formatPhoneInput(event.target.value) }))}
              inputMode="numeric"
              maxLength={MAX_PHONE_LENGTH}
              placeholder="+55 (81) 99999-9999"
              required
            />
          </label>

          <label>
            Hospital
            <select
              value={pacienteFormData.hospitalId ?? (pacienteFormData.hospital ? 'legacy' : '')}
              onChange={(event) => {
                if (event.target.value === 'legacy') {
                  return;
                }

                const hospitalId = event.target.value ? Number(event.target.value) : null;
                const hospital = hospitais.find((item) => item.id === hospitalId)?.nome ?? '';
                setPacienteFormData((current) => ({ ...current, hospitalId, hospital }));
              }}
              disabled={patientReadOnly || !hospitais.length}
              required
            >
              <option value="">{hospitais.length ? 'Selecione um hospital' : 'Nenhum hospital cadastrado'}</option>
              {pacienteFormData.hospital && !pacienteFormData.hospitalId && (
                <option value="legacy">{pacienteFormData.hospital} (fora do cadastro)</option>
              )}
              {hospitais.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
              ))}
            </select>
          </label>
          {hospitaisError && <p className="alert error">{hospitaisError}</p>}

          <label>
            Médico
            <input
              type="text"
              list={MEDICAL_USERS_DATALIST_ID}
              value={isMedical ? sessionUserName : pacienteFormData.medico}
              onChange={(event) => {
                const medico = event.target.value.slice(0, MAX_NAME_LENGTH);
                const selectedMedicoUser = findMedicalUserByName(medicalUsers, medico);
                setPacienteFormData((current) => ({ ...current, medicoUserId: selectedMedicoUser?.id ?? null, medico }));
              }}
              disabled={patientReadOnly || isMedical || (!medicalUsers.length && !pacienteFormData.medico)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={isMedical ? sessionUserName : medicalUsers.length ? 'Selecione ou digite o medico' : 'Nenhum medico cadastrado'}
            />
          </label>

          <label>
            Convênio
            <input
              type="text"
              list={CONVENIOS_DATALIST_ID}
              value={pacienteFormData.convenio}
              onChange={(event) => {
                const convenio = event.target.value.slice(0, MAX_NAME_LENGTH);
                const selectedConvenio = findConvenioByDescription(convenios, convenio);
                setPacienteFormData((current) => ({
                  ...current,
                  convenioId: selectedConvenio?.idConvenio ?? null,
                  convenio,
                }));
              }}
              disabled={patientReadOnly || (!convenios.length && !pacienteFormData.convenio)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={convenios.length ? 'Selecione ou digite o convenio' : 'Nenhum convenio cadastrado'}
            />
          </label>
          {conveniosError && <p className="alert error">{conveniosError}</p>}

          <div className="procedure-field">
            <span className="field-label">Procedimento</span>
            <div className="procedure-selector">
              <button
                type="button"
                className="ghost-button procedure-select-button"
                onClick={onOpenCbhpmModal}
                disabled={patientReadOnly}
              >
                <Search size={17} />
                Adicionar procedimento
              </button>

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
                        {!patientReadOnly && (
                          <button
                            type="button"
                            className="icon-button muted mini"
                            onClick={() => onRemovePacienteProcedimento(index)}
                            title="Remover procedimento"
                          >
                            <X size={14} />
                          </button>
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

          <label>
            Autorização
            <input
              type="text"
              value={pacienteFormData.autorizacao}
              onChange={(event) => setPacienteFormData((current) => ({ ...current, autorizacao: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
              maxLength={MAX_NAME_LENGTH}
            />
          </label>

          <div className="two-column-fields">
            <label>
              Valor recebido/pago
              <input
                type="text"
                value={pacienteFormData.pagamento}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, pagamento: formatCurrencyInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={24}
                placeholder="R$ 0,00"
              />
            </label>

            <label>
              Glosa
              <input
                type="text"
                value={pacienteFormData.repasseGlosa}
                onChange={(event) => setPacienteFormData((current) => ({ ...current, repasseGlosa: formatCurrencyInput(event.target.value) }))}
                inputMode="numeric"
                maxLength={24}
                placeholder="R$ 0,00"
              />
            </label>
          </div>

          <div className="profile-photo-field">
            <label className="field-label" htmlFor="patient-file-input">
              Arquivos
            </label>
            {canEditPatients && (
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
                        <button type="button" className="icon-button muted mini" onClick={() => onRemovePendingPatientFile(index)} title="Remover arquivo">
                          <X size={14} />
                        </button>
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
                    {canEditPatients && (
                      <button type="button" className="icon-button muted mini" onClick={() => void onDeletePacienteArquivo(editingPaciente, arquivo.id)} title="Excluir arquivo">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={pacienteFormData.statusPago}
              onChange={(event) => setPacienteFormData((current) => ({ ...current, statusPago: event.target.checked }))}
            />
            Status Pago
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={pacienteFormData.ativo}
              onChange={(event) => setPacienteFormData((current) => ({ ...current, ativo: event.target.checked }))}
            />
            Paciente ativo
          </label>
        </fieldset>

        {pacienteFormError && <p className="alert error">{pacienteFormError}</p>}

        {!patientReadOnly && (
          <button className="primary-action" type="submit" disabled={pacienteFormLoading}>
            {editingPacienteId ? <Save size={18} /> : <Plus size={18} />}
            {pacienteFormLoading ? 'Salvando...' : editingPacienteId ? 'Salvar paciente' : 'Cadastrar paciente'}
          </button>
        )}
      </form>
    </aside>
  );
}
