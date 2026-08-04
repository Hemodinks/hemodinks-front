import { MessageSquareReply, MessageSquareText, RefreshCw, Send, X } from 'lucide-react';
import type { Paciente, PacienteObservacao } from '../../types';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton, TextareaField } from '../../shared/components/ui';
import { formatProfileName, MAX_OBSERVATION_LENGTH, toNotificationDate } from '../../shared/utils/formatters';
import './patients.css';

type PatientObservacoesModalProps = {
  paciente: Paciente;
  observacoes: PacienteObservacao[];
  loading: boolean;
  saving: boolean;
  error: string;
  draft: string;
  replyTo: PacienteObservacao | null;
  onDraftChange: (value: string) => void;
  onReplyToChange: (observacao: PacienteObservacao | null) => void;
  onRefresh: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
};

export function PatientObservacoesModal({
  paciente,
  observacoes,
  loading,
  saving,
  error,
  draft,
  replyTo,
  onDraftChange,
  onReplyToChange,
  onRefresh,
  onSubmit,
  onClose,
}: PatientObservacoesModalProps) {
  const unreadObservations = paciente.observacoesNaoLidasCount ?? 0;

  return (
    <Modal titleId="patient-observacoes-title" className="patient-observacoes-modal" onClose={onClose}>
      <div className="panel-title">
        <div>
          <span className="eyebrow">Comunicação do paciente</span>
          <h2 id="patient-observacoes-title">{paciente.nomePaciente}</h2>
          <span className={`patient-observation-summary${unreadObservations > 0 ? ' has-unread-observations' : ' is-read'}`}>
            {unreadObservations > 0
              ? `${unreadObservations} observações não lidas`
              : 'Todas as observações estão lidas'}
          </span>
        </div>
        <div className="panel-title-actions">
          <IconButton label="Atualizar observações" title="Atualizar" tone="muted" onClick={onRefresh}>
            <RefreshCw size={17} />
          </IconButton>
          <IconButton label="Fechar observações" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
      </div>

      {replyTo && (
        <div className="patient-observation-reply-banner">
          <div>
            <strong>Respondendo {replyTo.autorNome}</strong>
            <p>{replyTo.texto}</p>
          </div>
          <IconButton label="Cancelar resposta" title="Cancelar resposta" tone="muted" onClick={() => onReplyToChange(null)}>
            <X size={16} />
          </IconButton>
        </div>
      )}

      <div className="patient-observation-compose">
        <TextareaField
          label={replyTo ? 'Resposta' : 'Nova observação'}
          value={draft}
          onValueChange={(value) => onDraftChange(value.slice(0, MAX_OBSERVATION_LENGTH))}
          maxLength={MAX_OBSERVATION_LENGTH}
          placeholder="Escreva a observação para este paciente."
          className="observation-textarea"
        />
        <div className="patient-observation-compose-footer">
          <span className="file-hint">{draft.length}/{MAX_OBSERVATION_LENGTH} caracteres</span>
          <Button variant="primary" className="patient-observation-submit" onClick={() => void onSubmit()} disabled={saving}>
            <Send size={16} />
            {saving ? 'Enviando...' : replyTo ? 'Responder' : 'Enviar observação'}
          </Button>
        </div>
      </div>

      {loading && <AlertMessage type="success" icon={<RefreshCw size={16} />}>Carregando observações...</AlertMessage>}
      {error && <AlertMessage type="error">{error}</AlertMessage>}

      {observacoes.length ? (
        <ul className="patient-observation-list">
          {observacoes.map((observacao) => (
            <li
              key={observacao.id}
              className={[
                observacao.enviadaPorMim ? 'is-outbound' : 'is-inbound',
                observacao.foiLida ? 'is-read' : 'is-unread',
              ].join(' ')}
            >
              <div className="patient-observation-card">
                <div className="patient-observation-card-header">
                  <span className="patient-observation-author">
                    <MessageSquareText size={15} />
                    {observacao.autorNome}
                  </span>
                  <span className="patient-observation-destination">Para {observacao.destinatarioNome}</span>
                </div>
                <p>{observacao.texto}</p>
                <div className="patient-observation-meta-row">
                  <span>{formatProfileName(observacao.autorPerfilId, observacao.autorPerfilNome)}</span>
                  <span>{toNotificationDate(observacao.dataCadastro) || 'Agora'}</span>
                  {observacao.foiLida ? (
                    <span className="patient-observation-read-status is-read">Lida</span>
                  ) : (
                    <span className="patient-observation-read-status is-unread">Não lida</span>
                  )}
                </div>
                <div className="patient-observation-actions">
                  <Button className="patient-observation-reply-action" onClick={() => onReplyToChange(observacao)}>
                    <MessageSquareReply size={16} />
                    Responder
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : !loading && !error ? (
        <p className="empty-row">Nenhuma observação registrada para este paciente.</p>
      ) : null}
    </Modal>
  );
}
