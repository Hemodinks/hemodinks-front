import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Calculator } from './Calculator';

describe('painel da calculadora', () => {
  it('opera por botões e anuncia números com vírgula', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    for (const name of ['1', 'Dividir', '2', 'Igual']) await user.click(screen.getByRole('button', { name }));
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent('0,5');
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent('0');
  });

  it('limita teclado ao painel e mantém atalhos, Tab e formulário externo', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><label>Valor externo<input /></label><Calculator /></form>);
    await user.type(screen.getByRole('textbox'), '123');
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent('0');
    expect(screen.getByRole('textbox')).toHaveValue('123');
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await user.keyboard('2,5*4{Enter}');
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent('10');
    expect(submit).not.toHaveBeenCalled();
    await user.keyboard('{Control>}7{/Control}');
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent('10');
    const focused = document.activeElement;
    await user.tab();
    expect(document.activeElement).not.toBe(focused);
  });

  it('apresenta erro recuperável e fecha somente por ação explícita', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<Calculator onClose={close} />);
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.keyboard('/0{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(/zero/i);
    await user.keyboard('3{Backspace}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent('0');
    screen.getByRole('button', { name: 'Fechar painel da calculadora' }).focus();
    await user.keyboard('{Enter}');
    expect(close).toHaveBeenCalledOnce();
  });
});
