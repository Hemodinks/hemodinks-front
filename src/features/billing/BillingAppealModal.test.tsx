import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BillingAppealModal } from './BillingAppealModal';
import type { AppealDraftState } from './billingPageTypes';

describe('BillingAppealModal', () => {
  it('edita e envia os dados do recurso', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());

    function Harness() {
      const [draft, setDraft] = useState<AppealDraftState>({
        justificativa: '',
        valorRecuperado: '0',
      });
      return (
        <BillingAppealModal
          valorGlosado={1250.5}
          draft={draft}
          loading={false}
          setDraft={setDraft}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      );
    }

    render(<Harness />);
    expect(
      screen.getByText((_, element) => element?.textContent === 'R$ 1.250,50'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Justificativa'), 'Documentação complementar');
    await user.clear(screen.getByLabelText('Valor recuperado'));
    await user.type(screen.getByLabelText('Valor recuperado'), '500');
    await user.click(screen.getByRole('button', { name: 'Registrar recurso' }));
    expect(onSubmit).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('bloqueia as ações enquanto registra', () => {
    render(
      <BillingAppealModal
        valorGlosado={100}
        draft={{ justificativa: 'Teste', valorRecuperado: '0' }}
        loading
        setDraft={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Registrando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
