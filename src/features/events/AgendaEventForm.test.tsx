import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AgendaEventForm } from './AgendaEventForm';
import { buildEmptyForm } from './agendaUtils';

function FormHarness({
  editing = false,
  loading = false,
}: {
  editing?: boolean;
  loading?: boolean;
}) {
  const [formData, setFormData] = useState(
    buildEmptyForm('2026-08-01', false, undefined, new Date('2026-07-31T08:00:00')),
  );
  return (
    <AgendaEventForm
      editingEventId={editing ? 9 : null}
      formData={formData}
      formLoading={loading}
      medicalUsers={[{ id: 2, nome: 'ana médica' }]}
      notificationRecipientOptions={{
        canNotifyAllAllowedRecipients: true,
        allRecipientsLabel: 'Todos os usuários permitidos',
        users: [
          {
            id: 3,
            nome: 'bruno gestor',
            email: 'bruno@example.com',
            perfilId: 1,
            perfilNome: 'Administrador',
          },
        ],
        groups: [{ id: 4, nome: 'Cirurgiões', membrosCount: 2 }],
      }}
      notificationRecipientsLoading={false}
      notificationRecipientsError=""
      setFormData={setFormData}
      onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
      onOpenCalendarSection={vi.fn()}
      onResetForm={vi.fn()}
      onToggleNotificationUser={(id) =>
        setFormData((current) => ({ ...current, notificationUserIds: [id] }))
      }
      onToggleNotificationGroup={(id) =>
        setFormData((current) => ({ ...current, notificationGroupIds: [id] }))
      }
    />
  );
}

describe('AgendaEventForm', () => {
  it('edita os campos, notificações e destinatários do evento', async () => {
    const user = userEvent.setup();
    render(<FormHarness />);

    await user.type(screen.getByLabelText('Título'), 'Reunião');
    await user.type(screen.getByLabelText('Descrição'), 'Discussão clínica');
    await user.click(screen.getByLabelText('Notificar perfil médico'));
    await user.selectOptions(screen.getByLabelText('Médico'), '2');
    await user.selectOptions(screen.getByLabelText('Intervalo de lembretes'), '60');
    await user.type(screen.getByLabelText('Mensagem da notificação'), 'Levar exames');
    await user.click(screen.getByLabelText('Todos os usuários permitidos'));
    await user.click(screen.getByLabelText(/Bruno Gestor/));
    await user.click(screen.getByLabelText(/Cirurgiões \(2\)/));

    expect(screen.getByLabelText('Título')).toHaveValue('Reunião');
    expect(screen.getByLabelText('Médico')).toHaveValue('2');
    expect(screen.getByLabelText(/Bruno Gestor/)).toBeChecked();
    expect(screen.getByLabelText(/Cirurgiões/)).toBeChecked();
  });

  it('apresenta corretamente os estados de edição e salvamento', () => {
    render(<FormHarness editing loading />);

    expect(screen.getByRole('heading', { name: 'Editar evento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar edição' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  });

  it('mostra erro ou carregamento quando destinatários não estão disponíveis', () => {
    const baseProps = {
      editingEventId: null,
      formData: buildEmptyForm('2026-08-01'),
      formLoading: false,
      medicalUsers: [],
      notificationRecipientOptions: null,
      setFormData: vi.fn(),
      onSubmit: vi.fn(),
      onOpenCalendarSection: vi.fn(),
      onResetForm: vi.fn(),
      onToggleNotificationUser: vi.fn(),
      onToggleNotificationGroup: vi.fn(),
    };
    const { rerender } = render(
      <AgendaEventForm
        {...baseProps}
        notificationRecipientsLoading
        notificationRecipientsError=""
      />,
    );
    expect(screen.getByText('Carregando destinatários disponíveis...')).toBeInTheDocument();

    rerender(
      <AgendaEventForm
        {...baseProps}
        notificationRecipientsLoading={false}
        notificationRecipientsError="Serviço indisponível."
      />,
    );
    expect(screen.getByText(/Serviço indisponível/)).toBeInTheDocument();
  });
});
