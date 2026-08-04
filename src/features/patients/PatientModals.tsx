import { FileText, X } from 'lucide-react';
import type { Paciente } from '../../types';
import { CopyValue } from '../../shared/components/CopyValue';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, IconButton } from '../../shared/components/ui';
import { SecureFileDownloadButton } from '../../shared/components/SecureFileDownloadButton';
import { downloadPacienteArquivo } from '../../services';
import { getPacienteProcedimentosFromPaciente } from './patientUtils';
import './patients.css';

type PatientInfoModalProps = {
  paciente: Paciente;
  onClose: () => void;
};

function renderInfoValue(label: string, value?: string | null) {
  return value?.trim()
    ? <CopyValue label={label} value={value} />
    : <span className="patient-info-empty">Não informado</span>;
}

export function PatientInfoModal({ paciente, onClose }: PatientInfoModalProps) {
  const procedimentos = getPacienteProcedimentosFromPaciente(paciente);

  return (
    <Modal titleId="patient-info-title" className="info-modal patient-info-modal" onClose={onClose}>
        <div className="panel-title patient-info-titlebar">
          <div>
            <span className="eyebrow">Informações adicionais</span>
            <h2 id="patient-info-title">{paciente.nomePaciente}</h2>
          </div>
          <IconButton label="Fechar informações do paciente" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="patient-info-layout">
          <section className="patient-info-summary-grid" aria-label="Resumo do paciente">
            <article className="patient-info-card patient-info-card-highlight">
              <span>Hospital</span>
              <div className="patient-info-card-content">
                {renderInfoValue('hospital do paciente', paciente.hospital)}
              </div>
            </article>

            <article className="patient-info-card patient-info-card-highlight patient-info-card-accent">
              <span>Convênio</span>
              <div className="patient-info-card-content">
                {renderInfoValue('convênio do paciente', paciente.convenio)}
              </div>
            </article>
          </section>

          <section className="patient-info-detail-grid" aria-label="Informações clínicas do paciente">
            <article className="patient-info-card">
              <span>Diagnóstico</span>
              <div className="patient-info-card-content">
                {renderInfoValue('diagnóstico do paciente', paciente.diagnostico)}
              </div>
            </article>

            <article className="patient-info-card">
              <span>Tratamento médico</span>
              <div className="patient-info-card-content">
                {renderInfoValue('tratamento médico do paciente', paciente.tratamentoMedico)}
              </div>
            </article>

            <article className="patient-info-card">
              <span>Cirurgião</span>
              <div className="patient-info-card-content">
                {renderInfoValue('cirurgião do paciente', paciente.medico)}
              </div>
            </article>

            <article className="patient-info-card">
              <span>Fornecedor OPME</span>
              <div className="patient-info-card-content">
                {renderInfoValue('fornecedor OPME', paciente.opmeFornecedor)}
              </div>
            </article>
          </section>

          <section className="patient-info-procedures-card" aria-label="Procedimentos do paciente">
            <div className="patient-info-section-heading">
              <span>Procedimentos</span>
              <strong>{procedimentos.length ? `${procedimentos.length} cadastrado(s)` : 'Nenhum procedimento cadastrado'}</strong>
            </div>

            {procedimentos.length ? (
              <ol className="info-procedure-list patient-info-procedure-list">
                {procedimentos.map((procedimento, index) => (
                  <li key={`${procedimento.cbhpmCodigo || procedimento.procedimento}-${index}`}>
                    <CopyValue label="procedimento médico" value={`${procedimento.cbhpmCodigo || 'Sem código'} - ${procedimento.procedimento}`} />
                    {procedimento.cbhpmPorte && <span className="status-pill active">{procedimento.cbhpmPorte}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="patient-info-empty">Nenhum procedimento informado.</p>
            )}
          </section>
        </div>
      </Modal>
  );
}

type PatientFilesModalProps = {
  paciente: Paciente;
  loading: boolean;
  error: string;
  sessionToken: string;
  onClose: () => void;
};

export function PatientFilesModal({ paciente, loading, error, sessionToken, onClose }: PatientFilesModalProps) {
  return (
    <Modal titleId="patient-files-title" className="info-modal files-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Arquivos anexos</span>
            <h2 id="patient-files-title">{paciente.nomePaciente}</h2>
          </div>
          <IconButton label="Fechar arquivos do paciente" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        {loading && <AlertMessage type="success" icon={<FileText size={17} />}>Carregando arquivos...</AlertMessage>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}

        {paciente.arquivos?.length ? (
          <ul className="file-list modal-file-list">
            {paciente.arquivos.map((arquivo) => (
              <li key={arquivo.id}>
                <FileText size={16} />
                <span>{arquivo.nomeOriginal}</span>
                <SecureFileDownloadButton
                  fileName={arquivo.nomeOriginal}
                  loadFile={() => downloadPacienteArquivo(paciente.id, arquivo.id, sessionToken)}
                />
              </li>
            ))}
          </ul>
        ) : !loading && !error ? (
          <p className="empty-row">Nenhum arquivo anexado.</p>
        ) : null}
      </Modal>
  );
}
