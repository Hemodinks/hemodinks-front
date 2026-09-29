import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AgendaRecipients } from './AgendaRecipients';
import { AgendaReminderSettings } from './AgendaReminderSettings';
import { buildEmptyForm } from './agendaUtils';

function Harness() {
  const [form, setForm] = useState(buildEmptyForm('2026-09-26'));
  return <><AgendaReminderSettings formData={form} setFormData={setForm} medicalUsers={[{ id: 2, nome: 'Ana' }]} />
    <AgendaRecipients formData={form} setFormData={setForm} notificationRecipientsLoading={false} notificationRecipientsError=""
      notificationRecipientOptions={{ users: [{ id: 2, nome: 'Ana', email: 'ana@test.local', perfilId: 2, perfilNome: 'Médicos' }], groups: [],
        canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos da clínica permitidos', totalUsers: 1, page: 1, pageSize: 20 }}
      onToggleNotificationUser={id => setForm(current => ({ ...current, notificationUserIds: current.notificationUserIds.includes(id) ? [] : [id] }))}
      onToggleNotificationGroup={vi.fn()} /></>;
}
it('separates profile from name, counts selection, switches all/specific and counts the real message limit', () => {
  render(<Harness />);
  const user = screen.getByRole('checkbox', { name: 'Ana' });
  expect(user).toHaveAccessibleDescription('Médicos');
  fireEvent.click(user);
  expect(screen.getByText('1 destinatários selecionados individualmente')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Mensagem da notificação'), { target: { value: 'a'.repeat(501) } });
  expect(screen.getByLabelText('Mensagem da notificação')).toHaveValue('a'.repeat(500));
  expect(screen.getByText('500/500 caracteres')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Enviar notificação para'), { target: { value: 'all' } });
  expect(screen.queryByRole('checkbox', { name: 'Ana' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Enviar notificação para'), { target: { value: 'specific' } });
  expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked();
});
it('hides periodic settings when both recipients of reminders are disabled and keeps medical reminders independent', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Repetir lembrete')).toHaveValue('1440');
  fireEvent.click(screen.getByLabelText('Receber lembretes'));
  expect(screen.queryByLabelText('Repetir lembrete')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Enviar lembretes aos médicos'));
  expect(screen.getByLabelText('Repetir lembrete')).toHaveValue('1440');
  expect(screen.getByLabelText('Médicos que receberão lembretes')).toHaveValue('');
  expect(screen.getByText(/Você não receberá lembretes/)).toBeInTheDocument();
});
