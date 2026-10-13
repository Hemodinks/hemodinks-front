import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AgendaEvent, AuthSession } from '../../types';
import * as service from '../../services/eventEmailService';
import { AgendaEventEmailModal } from './AgendaEventEmailModal';
import { AgendaEventCard } from './AgendaEventCard';
vi.mock('../../services/eventEmailService', () => ({ getEventEmailNotification: vi.fn(), queueEventEmailNotification: vi.fn() }));
const event = { id: 10, title: 'Reunião', userId: 1, start: '2026-10-11T12:00:00Z', end: '2026-10-11T13:00:00Z' } as AgendaEvent;
const session = { token: 'token', user: { id: 1, clinicaId: 1 } } as AuthSession;
beforeEach(() => { vi.resetAllMocks(); vi.mocked(service.getEventEmailNotification).mockResolvedValue({
  recipients: [{ userId: 2, nome: 'Pessoa permitida', email: 'pessoa@example.test', status: 'available' }],
  recipientCount: 1, pendingCount: 0, sentCount: 0, failedCount: 0, excludedCount: 1, canSend: true,
}); });

it('requires an explicit confirmation, exposes recipients and distinguishes queued from delivered', async () => {
  vi.mocked(service.queueEventEmailNotification).mockResolvedValue({ queuedCount: 1 });
  render(<AgendaEventEmailModal event={event} session={session} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog', { name: 'Notificar por e-mail' })).toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: 'Confirmar envio por e-mail' });
  expect(confirm).toBeDisabled();
  await waitFor(() => expect(confirm).toBeEnabled());
  expect(screen.getByText('Pessoa permitida')).toBeVisible();
  expect(screen.getByText('pessoa@example.test')).toBeVisible();
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  await screen.findByText(/Isso ainda não confirma a entrega/);
  expect(confirm).toBeDisabled();
});

it('shows an error and never enables confirmation after a forbidden preview', async () => {
  vi.mocked(service.getEventEmailNotification).mockRejectedValue(new Error('Operação não permitida.'));
  render(<AgendaEventEmailModal event={event} session={session} onClose={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Operação não permitida.');
  expect(screen.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
});

it('only exposes the event action to a manager and hides it for completed events', () => {
  const notify = vi.fn();
  const props = { agendaEvent: event, isAdmin: false, currentUserId: 2, onNotifyEmail: notify,
    onComplete: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  const { rerender } = render(<AgendaEventCard {...props} />);
  expect(screen.queryByRole('button', { name: 'Notificar por e-mail' })).not.toBeInTheDocument();
  rerender(<AgendaEventCard {...props} currentUserId={1} />);
  fireEvent.click(screen.getByRole('button', { name: 'Notificar por e-mail' }));
  expect(notify).toHaveBeenCalledWith(event);
  rerender(<AgendaEventCard {...props} isAdmin agendaEvent={{ ...event, isCompleted: true }} />);
  expect(screen.queryByRole('button', { name: 'Notificar por e-mail' })).not.toBeInTheDocument();
});


it('provides an explicit accessible close action without submitting emails', async () => {
  const onClose = vi.fn();
  render(<AgendaEventEmailModal event={event} session={session} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação por e-mail' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
});

it('explains why confirmation is disabled when recipients are already queued', async () => {
  vi.mocked(service.getEventEmailNotification).mockResolvedValue({
    recipients: [{ userId: 2, nome: 'Pessoa permitida', email: 'pessoa@example.test', status: 'pending' }],
    recipientCount: 1, pendingCount: 1, sentCount: 0, failedCount: 0, excludedCount: 0, canSend: false,
  });
  render(<AgendaEventEmailModal event={event} session={session} onClose={vi.fn()} />);
  const reason = await screen.findByText('Os e-mails já estão na fila de envio ou foram enviados. Não é necessário confirmar novamente.');
  const confirm = screen.getByRole('button', { name: 'Confirmar envio por e-mail' });
  expect(confirm).toBeDisabled();
  expect(confirm).toHaveAccessibleDescription(reason.textContent!);
  fireEvent.click(confirm);
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
});
