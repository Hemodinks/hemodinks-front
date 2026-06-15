import { Download, FileText, X } from 'lucide-react';
import type { Paciente } from '../../types';
import { CopyValue } from '../../shared/components/CopyValue';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, IconButton } from '../../shared/components/ui';
import { getPacienteProcedimentosFromPaciente } from './patientUtils';

type PatientInfoModalProps = {
  paciente: Paciente;
  onClose: () => void;
};

export function PatientInfoModal({ paciente, onClose }: PatientInfoModalProps) {
  const procedimentos = getPacienteProcedimentosFromPaciente(paciente);

  return (
    <Modal titleId="patient-info-title" className="info-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Informacoes adicionais</span>
            <h2 id="patient-info-title">{paciente.nomePaciente}</h2>
          </div>
          <IconButton label="Fechar informacoes do paciente" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <dl className="info-list">
          <div>
            <dt>Procedimentos</dt>
            <dd>
              {procedimentos.length ? (
                <ol className="info-procedure-list">
                  {procedimentos.map((procedimento, index) => (
                    <li key={`${procedimento.cbhpmCodigo || procedimento.procedimento}-${index}`}>
                      <CopyValue label="procedimento medico" value={`${procedimento.cbhpmCodigo || 'Sem codigo'} - ${procedimento.procedimento}`} />
                      {procedimento.cbhpmPorte && <span className="status-pill active">{procedimento.cbhpmPorte}</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                '-'
              )}
            </dd>
          </div>
        </dl>
      </Modal>
  );
}

type PatientFilesModalProps = {
  paciente: Paciente;
  loading: boolean;
  error: string;
  onClose: () => void;
};

export function PatientFilesModal({ paciente, loading, error, onClose }: PatientFilesModalProps) {
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
                <a className="download-link" href={arquivo.url} target="_blank" rel="noreferrer" download={arquivo.nomeOriginal}>
                  <Download size={15} />
                  Baixar
                </a>
              </li>
            ))}
          </ul>
        ) : !loading && !error ? (
          <p className="empty-row">Nenhum arquivo anexado.</p>
        ) : null}
      </Modal>
  );
}
