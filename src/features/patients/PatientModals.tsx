import { Download, FileText, X } from 'lucide-react';
import type { Paciente } from '../../types';
import { CopyValue } from '../../shared/components/CopyValue';
import { formatCpfInput, formatPhoneInput } from '../../shared/utils/formatters';
import { getPacienteProcedimentosFromPaciente } from './patientUtils';

type PatientInfoModalProps = {
  paciente: Paciente;
  onClose: () => void;
};

export function PatientInfoModal({ paciente, onClose }: PatientInfoModalProps) {
  const formattedCpf = formatCpfInput(paciente.cpf || '');
  const formattedPhone = formatPhoneInput(paciente.telefone || '');
  const procedimentos = getPacienteProcedimentosFromPaciente(paciente);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel info-modal" role="dialog" aria-modal="true" aria-labelledby="patient-info-title">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Informacoes adicionais</span>
            <h2 id="patient-info-title">{paciente.nomePaciente}</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
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
          <div>
            <dt>CPF</dt>
            <dd><CopyValue label="CPF" value={formattedCpf || '-'} /></dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd><CopyValue label="telefone" value={formattedPhone || '-'} /></dd>
          </div>
        </dl>
      </section>
    </div>
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
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel info-modal files-modal" role="dialog" aria-modal="true" aria-labelledby="patient-files-title">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Arquivos anexos</span>
            <h2 id="patient-files-title">{paciente.nomePaciente}</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {loading && <p className="alert success"><FileText size={17} />Carregando arquivos...</p>}
        {error && <p className="alert error">{error}</p>}

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
      </section>
    </div>
  );
}
