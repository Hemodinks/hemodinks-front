import type { ChangeEvent } from 'react';
import { FileText, FileUp, Trash2, X } from 'lucide-react';
import type { Paciente } from '../../../types';
import { IconButton } from '../../../shared/components/ui';
import { SecureFileDownloadButton } from '../../../shared/components/SecureFileDownloadButton';
import { downloadPacienteArquivo } from '../../../services';

type Props = {
  formReadOnly: boolean;
  canEditPatients: boolean;
  editingPaciente: Paciente | null;
  pendingFiles: File[];
  inputKey: number;
  sessionToken: string;
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePending: (index: number) => void;
  onDelete: (paciente: Paciente, arquivoId: number) => void | Promise<void>;
};

export function PatientFilesSection({ formReadOnly, canEditPatients, editingPaciente, pendingFiles, inputKey, sessionToken, onFilesChange, onRemovePending, onDelete }: Props) {
  return (
    <div className="profile-photo-field">
      <label className="field-label" htmlFor="patient-file-input">Arquivos</label>
      {!formReadOnly && canEditPatients && (
        <>
          <label className="ghost-button file-action full-width" htmlFor="patient-file-input"><FileUp size={17} />Selecionar arquivos</label>
          <input key={inputKey} id="patient-file-input" className="sr-only" type="file" aria-label="Arquivos do paciente" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.csv,.ppt,.pptx" multiple onChange={onFilesChange} />
          {pendingFiles.length > 0 && (
            <ul className="file-list">
              {pendingFiles.map((file, index) => (
                <li key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name}</span><IconButton label="Remover arquivo" tone="muted" className="mini" onClick={() => onRemovePending(index)}><X size={14} /></IconButton></li>
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
              <SecureFileDownloadButton fileName={arquivo.nomeOriginal} label={arquivo.nomeOriginal} loadFile={() => downloadPacienteArquivo(editingPaciente.id, arquivo.id, sessionToken)} />
              {!formReadOnly && canEditPatients && <IconButton label="Excluir arquivo" tone="muted" className="mini" onClick={() => void onDelete(editingPaciente, arquivo.id)}><Trash2 size={14} /></IconButton>}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
