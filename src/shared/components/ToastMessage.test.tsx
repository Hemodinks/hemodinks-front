import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertMessage, TOAST_DURATION_MS, ToastMessage } from './ui';

describe('ToastMessage', () => {
  afterEach(() => vi.useRealTimers());

  it('fecha automaticamente depois de dez segundos', () => {
    vi.useFakeTimers();
    render(<ToastMessage type="success">Alteração concluída.</ToastMessage>);

    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('permite fechar manualmente pelo botao', () => {
    render(<ToastMessage type="error">Não foi possível concluir.</ToastMessage>);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('posiciona a tela no topo e move o foco para uma nova confirmacao', () => {
    vi.mocked(window.scrollTo).mockClear();
    render(<ToastMessage type="success">Cadastro realizado com sucesso.</ToastMessage>);

    const toast = screen.getByRole('status');
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(toast).toHaveFocus();
    expect(toast).toHaveAttribute('tabindex', '-1');
  });
});

describe('AlertMessage', () => {
  it('posiciona a tela no topo e move o foco para erros de validacao', () => {
    vi.mocked(window.scrollTo).mockClear();
    render(<AlertMessage type="error">Preencha os campos obrigatórios.</AlertMessage>);

    const alert = screen.getByRole('alert');
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(alert).toHaveFocus();
  });

  it('nao rouba o foco para avisos apenas informativos', () => {
    vi.mocked(window.scrollTo).mockClear();
    render(<AlertMessage type="warning">Informação complementar.</AlertMessage>);

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).not.toHaveAttribute('tabindex');
  });
});
