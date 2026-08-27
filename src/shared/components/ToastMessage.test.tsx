import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, ToastMessage } from './ui';

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
});
