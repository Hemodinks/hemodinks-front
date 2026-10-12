import { useId } from 'react';
import type { AgendaEvent, AuthSession } from '../../types';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button } from '../../shared/components/ui';
import { useAgendaEventEmail } from './useAgendaEventEmail';
import './agenda-email.css';

const statusLabels = {
  available: 'Disponível para envio', pending: 'Aguardando envio', sent: 'Enviado', failed: 'Falha no envio',
};

type Props = { event: AgendaEvent; session: AuthSession; onClose: () => void };
export function AgendaEventEmailModal({ event, session, onClose }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const email = useAgendaEventEmail(event.id, session);
  return <Modal titleId={titleId} descriptionId={descriptionId} className="agenda-email-modal"
    onClose={() => { if (!email.submitting) onClose(); }}>
    <div className="agenda-email-heading"><h2 id={titleId}>Notificar por e-mail</h2><Button type="button" variant="ghost" onClick={onClose} disabled={email.submitting} aria-label="Fechar notificação por e-mail">Fechar</Button></div>
    <p id={descriptionId}>Confira os destinatários de “{event.title}”. A confirmação solicita um envio por pessoa, sem alterar os lembretes do evento.</p>
    {email.loading && <p role="status">Carregando destinatários...</p>}
    {email.error && <AlertMessage type="error">{email.error}</AlertMessage>}
    {email.result && <AlertMessage type="success">{email.result.queuedCount > 0
      ? email.result.queuedCount + ' destinatário(s) na fila de envio. Isso ainda não confirma a entrega dos e-mails.'
      : 'Nenhum novo envio solicitado. Confira os estados abaixo.'}</AlertMessage>}
    {email.preview && <>
      <p>{email.preview.recipientCount} destinatário(s) permitido(s). {email.preview.pendingCount} aguardando envio; {email.preview.sentCount} enviado(s).</p>
      {email.preview.failedCount > 0 && <AlertMessage type="warning">{email.preview.failedCount} envio(s) falharam. Entre em contato com o suporte.</AlertMessage>}
      {email.preview.excludedCount > 0 && <p>Alguns destinatários foram excluídos por indisponibilidade ou falta de permissão atual.</p>}
      {email.preview.recipients.length ? <ul className="agenda-email-recipients" aria-label="Destinatários do e-mail">
        {email.preview.recipients.map(recipient => <li key={recipient.userId}>
          <strong>{recipient.nome}</strong><span>{recipient.email}</span><small>{statusLabels[recipient.status]}</small>
        </li>)}
      </ul> : <p>Este evento não possui destinatários disponíveis para e-mail. Os destinatários são registrados na criação do evento.</p>}
    </>}
    <div className="agenda-email-actions">
      <Button type="button" onClick={onClose} disabled={email.submitting}>{email.result ? 'Fechar' : 'Cancelar'}</Button>
      {!email.loading && <Button type="button" onClick={email.retry} disabled={email.submitting}>Atualizar destinatários</Button>}
      <Button type="button" variant="primary" onClick={() => void email.send()}
        disabled={email.loading || email.submitting || !email.preview?.canSend || Boolean(email.result)}>
        {email.submitting ? 'Solicitando envio...' : 'Confirmar envio por e-mail'}
      </Button>
    </div>
  </Modal>;
}
