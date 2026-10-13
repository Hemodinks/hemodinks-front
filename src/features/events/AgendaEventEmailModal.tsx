import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { AgendaEvent, AuthSession } from '../../types';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton } from '../../shared/components/ui';
import { useAgendaEventEmail } from './useAgendaEventEmail';
import './agenda-email.css';

const statusLabels = {
  available: 'Disponível para envio', pending: 'Aguardando envio', sent: 'Enviado', failed: 'Falha no envio',
};
const creatorReasons: Record<string, string> = {
  creator_unknown: 'Este evento antigo não possui um criador identificado com segurança.',
  creator_not_authorized: 'O criador não está disponível ou não tem acesso atual a este evento.',
  invalid_email: 'O criador não possui um e-mail válido para receber a cópia.',
  event_completed: 'Eventos concluídos não permitem novos envios.',
  already_requested: 'A cópia já foi solicitada. Confira seu estado abaixo; ela não será duplicada.',
};

type Props = { event: AgendaEvent; session: AuthSession; onClose: () => void };
export function AgendaEventEmailModal({ event, session, onClose }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const copyId = useId();
  const reasonId = useId();
  const email = useAgendaEventEmail(event.id, session);
  const preview = email.preview;
  const creator = preview?.creatorCopy;
  const unavailableCopy = !creator ? 'A cópia ao criador ainda não está disponível neste ambiente.'
    : creator.unavailableReason ? creatorReasons[creator.unavailableReason] ?? 'A cópia não está disponível para este evento.' : '';
  const blockedReason = email.loading ? 'Carregando destinatários antes de liberar a confirmação.'
    : email.submitting ? 'Solicitando a inclusão dos e-mails na fila de envio.'
    : email.result ? 'Solicitação aceita. Atualize o status para acompanhar o processamento.'
    : !preview ? 'Não foi possível consultar os destinatários. Atualize para tentar novamente.'
    : preview.canSend ? 'Ao confirmar, os e-mails serão colocados na fila de envio. A entrega pode levar alguns instantes.'
    : event.isCompleted ? 'Eventos concluídos não permitem novos envios.'
    : preview.recipients.length > 0 && preview.recipients.every(recipient => recipient.status === 'pending' || recipient.status === 'sent')
      ? 'Os e-mails já estão na fila de envio ou foram enviados. Não é necessário confirmar novamente.'
    : preview.pendingCount > 0 ? 'O envio já foi solicitado e está na fila. Aguarde o processamento ou atualize o status.'
    : preview.failedCount > 0 ? 'Não há novos destinatários disponíveis. Este modal não refaz envios já solicitados.'
    : preview.sentCount > 0 ? 'Os envios já foram solicitados para todos os destinatários disponíveis. Eles não serão duplicados.'
    : preview.recipientCount === 0 ? 'Não há destinatários disponíveis. Se autorizado, selecione a cópia ao criador.'
    : 'O envio não está autorizado para este evento no estado atual.';
  return createPortal(<Modal titleId={titleId} descriptionId={descriptionId} className="agenda-email-modal" backdropClassName="agenda-email-backdrop"
    onClose={() => { if (!email.submitting) onClose(); }}>
    <header className="agenda-email-heading">
      <h2 id={titleId}>Notificar por e-mail</h2>
      <IconButton label="Fechar notificação por e-mail" tone="muted" className="agenda-email-close" onClick={onClose} disabled={email.submitting}>
        <X size={20} aria-hidden="true" />
      </IconButton>
    </header>
    <div className="agenda-email-body">
      <p id={descriptionId} className="agenda-email-description">Confira os destinatários de “{event.title}”. Cada pessoa recebe uma mensagem individual, sem alterar os lembretes do evento.</p>
      {email.loading && <p role="status">Carregando destinatários...</p>}
      {email.error && <AlertMessage type="error">{email.error} Atualize os destinatários ou tente novamente. Se persistir, informe ao suporte o evento e o horário da tentativa.</AlertMessage>}
      {email.result && <AlertMessage type="success">{email.result.queuedCount > 0
        ? email.result.queuedCount + ' destinatário(s) na fila de envio. Isso ainda não confirma a entrega dos e-mails.'
        : 'Nenhum novo envio solicitado. Confira os estados abaixo.'}</AlertMessage>}
      {preview && <>
        <dl className="agenda-email-summary" aria-label="Resumo do envio">
          <div><dt>Destinatários</dt><dd>{preview.recipientCount}</dd></div>
          <div><dt>Na fila</dt><dd>{preview.pendingCount}</dd></div>
          <div><dt>Enviados</dt><dd>{preview.sentCount}</dd></div>
          <div><dt>Falhas</dt><dd>{preview.failedCount}</dd></div>
        </dl>
        <div className="agenda-email-copy">
          <label htmlFor={copyId}><input id={copyId} type="checkbox" checked={email.copyToCreator}
            onChange={e => email.setCopyToCreator(e.target.checked)} aria-describedby={copyId + '-description'}
            disabled={email.loading || email.submitting || email.copyLocked || (!creator?.canSend && !email.copyToCreator)} />Enviar cópia ao criador</label>
          <p id={copyId + '-description'}>{unavailableCopy || (email.copyLocked
            ? 'A seleção foi mantida para repetir com segurança a mesma solicitação, se necessário.'
            : 'A cópia é opcional. Se o criador já estiver na lista, receberá apenas uma mensagem.')}</p>
          {creator?.recipient && <p>{creator.recipient.nome} · {creator.recipient.email} · {statusLabels[creator.recipient.status]}</p>}
        </div>
        {preview.failedCount > 0 && <AlertMessage type="warning">{preview.failedCount} envio(s) falharam. Atualize o status; se a falha persistir, informe ao suporte o evento e o horário da tentativa. Nenhum envio já solicitado será duplicado por este modal.</AlertMessage>}
        {preview.excludedCount > 0 && <p className="agenda-email-note">Alguns destinatários foram excluídos por indisponibilidade ou falta de permissão atual.</p>}
        {preview.recipients.length ? <ul className="agenda-email-recipients" aria-label="Destinatários do e-mail">
          {preview.recipients.map(recipient => <li key={recipient.userId}>
            <div><strong>{recipient.nome}</strong><span>{recipient.email}</span></div><small className={'agenda-email-status agenda-email-status-' + recipient.status}>{statusLabels[recipient.status]}</small>
          </li>)}
        </ul> : <p>Este evento não possui destinatários disponíveis para e-mail. Os destinatários são registrados na criação do evento.</p>}
        <p className="agenda-email-note">“Enviado” indica aceitação pelo serviço de envio. Não há confirmação de entrega na caixa de entrada.</p>
      </>}
      <p id={reasonId} className="agenda-email-reason" role="status">{blockedReason}</p>
    </div>
    <footer className="agenda-email-actions">
      <Button type="button" onClick={onClose} disabled={email.submitting}>{email.result ? 'Fechar' : 'Cancelar'}</Button>
      {!email.loading && <Button type="button" onClick={email.retry} disabled={email.submitting}>Atualizar destinatários</Button>}
      <Button type="button" variant="primary" onClick={() => void email.send()} aria-describedby={reasonId}
        disabled={email.loading || email.submitting || !preview?.canSend || Boolean(email.result)}>
        {email.submitting ? 'Solicitando envio...' : 'Confirmar envio por e-mail'}
      </Button>
    </footer>
  </Modal>, document.body);
}
