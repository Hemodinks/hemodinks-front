import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './DateInput';

describe('DateInput', () => {
  it('preserva máscara digitada, sincronização com calendário e limites', async () => {
    function Field() {
      const [value, setValue] = useState('');
      return <DateInput id="request-date" label="Data da Solicitação" value={value} onChange={setValue}
        min="01/01/2026" max="31/12/2026" required />;
    }
    const user = userEvent.setup();
    render(<Field />);
    const text = screen.getByRole('textbox', { name: 'Data da Solicitação' });
    const picker = screen.getByLabelText('Selecionar data da solicitação');
    expect(text).toBeRequired();
    expect(text).toHaveAttribute('inputmode', 'numeric');
    expect(picker).toHaveAttribute('min', '2026-01-01');
    expect(picker).toHaveAttribute('max', '2026-12-31');
    await user.type(text, '02062026');
    expect(text).toHaveValue('02/06/2026');
    expect(picker).toHaveValue('2026-06-02');
    // userEvent não emula o calendário nativo do navegador no jsdom.
    fireEvent.change(picker, { target: { value: '2026-07-03' } });
    expect(text).toHaveValue('03/07/2026');
    await user.clear(text);
    expect(picker).toHaveValue('');
  });

  it('desabilita os dois controles sem alterar valor', async () => {
    const changed = vi.fn();
    const user = userEvent.setup();
    render(<DateInput id="disabled-date" label="Data" value="02/06/2026" onChange={changed} disabled />);
    const text = screen.getByRole('textbox', { name: 'Data' });
    expect(text).toBeDisabled();
    expect(screen.getByLabelText('Selecionar data')).toBeDisabled();
    await user.type(text, '01012026');
    expect(text).toHaveValue('02/06/2026');
    expect(changed).not.toHaveBeenCalled();
  });
});
