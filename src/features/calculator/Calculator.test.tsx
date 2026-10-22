import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Calculator } from './Calculator';

describe('painel da calculadora', () => {
  it('mantém operações concluídas durante o uso e permite limpar somente o histórico pelo teclado', async () => {
    const user = userEvent.setup();
    const view = render(<Calculator />);
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.keyboard('*5{Enter}+9{Enter}{Enter}');
    const history = screen.getByRole('region', { name: 'Histórico de operações' });
    expect(within(history).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      '49 + 9 =58', '40 + 9 =49', '8 × 5 =40',
    ]);
    await user.keyboard('{Delete}1/0{Enter}');
    expect(within(history).getAllByRole('listitem')).toHaveLength(3);
    await user.keyboard('2,5*4{Enter}');
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('2,5 × 4 =10');
    screen.getByRole('button', { name: 'Limpar histórico' }).focus();
    await user.keyboard('{Enter}');
    expect(within(history).queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent(/^10$/);
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.keyboard('+4{Enter}');
    view.unmount();
    render(<Calculator />);
    expect(screen.getByText('Nenhuma operação nesta utilização.')).toBeInTheDocument();
  });

  it('calcula porcentagem por botão e teclado, sem repetir a conversão', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await user.keyboard('200+10');
    await user.click(screen.getByRole('button', { name: 'Porcentagem' }));
    await user.keyboard('%{Enter}');
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent(/^220$/);
    await user.keyboard('{Delete}10%');
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent(/^0,1$/);
    await user.keyboard('{Delete}200/10%{Enter}');
    expect(screen.getByLabelText('Resultado da calculadora')).toHaveTextContent(/^2000$/);
  });

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
