import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TutorialProvider } from '../features/tutorials/TutorialProvider';
import { ContextualTools } from './ContextualTools';

const preference = vi.hoisted(() => ({ visible: true, setVisible: vi.fn() }));
vi.mock('../features/calculator/CalculatorPreferenceProvider', () => ({ useCalculatorPreference: () => preference }));
vi.mock('../features/calculator/Calculator', () => ({ Calculator: () => <section aria-label="Calculadora"><button type="button">Limpar</button></section> }));
function tools() {
  return <TutorialProvider activeView="patients" allowedTutorialIds={[]}><ContextualTools activeView="patients" /></TutorialProvider>;
}
describe('ferramentas laterais da tela', () => {
  it('alterna painéis exclusivos, fecha no mesmo botão e devolve foco por Escape', async () => {
    const user = userEvent.setup();
    render(tools());
    const calculator = screen.getByRole('button', { name: 'Abrir calculadora' });
    const help = screen.getByRole('button', { name: 'Abrir ajuda de Pacientes - Cirurgias' });
    expect(calculator).toHaveAttribute('aria-expanded', 'false');
    await user.click(calculator);
    expect(screen.getByRole('button', { name: 'Fechar calculadora' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Calculadora' })).toBeVisible();
    await user.click(help);
    expect(screen.queryByRole('region', { name: 'Calculadora' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pacientes - Cirurgias' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Abrir ajuda de Pacientes - Cirurgias' })).toHaveFocus();
    await user.click(calculator);
    await user.click(screen.getByRole('button', { name: 'Fechar calculadora' }));
    expect(calculator).toHaveAttribute('aria-expanded', 'false');
  });
  it('oculta e fecha imediatamente ao desabilitar; reabilita fechado', async () => {
    preference.visible = true;
    const user = userEvent.setup();
    const { rerender } = render(tools());
    await user.click(screen.getByRole('button', { name: 'Abrir calculadora' }));
    preference.visible = false;
    rerender(tools());
    expect(screen.queryByRole('button', { name: 'Fechar calculadora' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Calculadora' })).not.toBeInTheDocument();
    preference.visible = true;
    rerender(tools());
    expect(screen.getByRole('button', { name: 'Abrir calculadora' })).toHaveAttribute('aria-expanded', 'false');
  });
});
