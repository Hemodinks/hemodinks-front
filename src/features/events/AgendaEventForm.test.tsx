import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AgendaEventForm } from './AgendaEventForm';
import { buildEmptyForm } from './agendaUtils';

it('groups existing fields accessibly and exposes cancel/create actions', () => {
  const cancel = vi.fn(); const calendar = vi.fn(); const submit = vi.fn(event => event.preventDefault());
  render(<AgendaEventForm editingEventId={null} formData={buildEmptyForm('2026-09-26')} formLoading={false}
    fieldErrors={{ title: 'Título é obrigatório.' }} onScheduleChange={vi.fn()} medicalUsers={[]}
    notificationRecipientOptions={{ users: [], groups: [], canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos' }}
    notificationRecipientsLoading={false} notificationRecipientsError="" setFormData={vi.fn()}
    onSubmit={submit} onOpenCalendarSection={calendar} onResetForm={cancel}
    onToggleNotificationUser={vi.fn()} onToggleNotificationGroup={vi.fn()} />);
  for (const name of ['Informações do evento', 'Data e horário', 'Notificações e lembretes', 'Destinatários'])
    expect(screen.getByRole('group', { name })).toBeInTheDocument();
  expect(screen.getByLabelText('Título')).toHaveAccessibleDescription('Título é obrigatório.');
  fireEvent.click(screen.getByRole('button', { name: 'Criar evento' }));
  expect(submit).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(cancel).toHaveBeenCalledOnce(); expect(calendar).toHaveBeenCalledOnce();
});
