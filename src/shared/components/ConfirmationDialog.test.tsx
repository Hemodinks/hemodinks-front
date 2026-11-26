import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useConfirmationDialog, type ConfirmationRequest } from './ConfirmationDialog';

function Harness({ request }: { request: ConfirmationRequest }) {
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  return <><button type="button" onClick={() => confirmAction(request)}>Abrir</button>{confirmationDialog}</>;
}

describe('diálogo de confirmação com motivo', () => {
  it('exige o motivo, limita a 500 caracteres e entrega o texto sem espaços nas pontas', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness request={{ tone: 'delete', title: 'Inativar paciente?', message: 'Confirme.',
      reason: { label: 'Motivo (obrigatório)', maxLength: 500 }, onConfirm }} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const confirm = screen.getByRole('button', { name: 'Sim' });
    expect(confirm).toBeDisabled();
    const textarea = screen.getByLabelText('Motivo (obrigatório)');
    expect(textarea).toHaveAttribute('maxLength', '500');
    await user.type(textarea, '   ');
    expect(confirm).toBeDisabled();
    await user.clear(textarea);
    await user.type(textarea, '  Paciente transferido  ');
    expect(screen.getByText('24/500 caracteres')).toBeInTheDocument();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('Paciente transferido');
  });

  it('sem motivo continua confirmando direto', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness request={{ tone: 'update', title: 'Salvar?', message: 'Confirme.', onConfirm }} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sim' }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });
});
