import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LoginLoadingOverlay } from './LoginLoadingOverlay';
import { getLoginErrorMessage } from './loginFeedback';
import { ApiError } from '../../services/api';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('explains prolonged waiting, allows cancellation and resets for the next attempt', () => {
  vi.useFakeTimers();
  const onCancel = vi.fn();
  const { rerender } = render(<LoginLoadingOverlay active onCancel={onCancel} />);
  expect(screen.getByText('Conectando ao serviço de acesso…')).toBeTruthy();
  act(() => vi.advanceTimersByTime(12_000));
  expect(screen.getByText(/primeiro acesso após/)).toBeTruthy();
  act(() => vi.advanceTimersByTime(23_000));
  expect(screen.getByText(/Ainda estamos aguardando/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar tentativa' }));
  expect(onCancel).toHaveBeenCalledOnce();
  rerender(<LoginLoadingOverlay active={false} onCancel={onCancel} />);
  expect(screen.queryByRole('status')).toBeNull();
  rerender(<LoginLoadingOverlay active onCancel={onCancel} />);
  expect(screen.getByText('Conectando ao serviço de acesso…')).toBeTruthy();
  expect(screen.queryByText(/Ainda estamos aguardando/)).toBeNull();
});

it.each([502, 503, 504])('explains gateway failure %i without claiming a confirmed cold start', status => {
  expect(getLoginErrorMessage(new ApiError('gateway', status))).toContain('pode estar iniciando');
});

it('preserves credential errors', () => {
  expect(getLoginErrorMessage(new ApiError('Credenciais inválidas.', 401))).toBe('Credenciais inválidas.');
});
