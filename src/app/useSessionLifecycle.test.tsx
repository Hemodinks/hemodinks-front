import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '../shared/domain/sessionTypes';
import {
  configureAuthSessionRecovery,
  logoutSession,
  recordSessionActivity,
  refreshSession,
} from '../services';
import { SESSION_IDLE_TIMEOUT_MS, SESSION_REFRESH_INTERVAL_MS } from './sessionInactivity';
import { useSessionLifecycle } from './useSessionLifecycle';

vi.mock('../services', () => ({
  AUTH_EXPIRED_EVENT: 'hemodinks:auth-expired',
  configureAuthSessionRecovery: vi.fn(() => () => undefined),
  getCurrentLicenca: vi.fn(),
  logoutSession: vi.fn(),
  recordSessionActivity: vi.fn(),
  refreshSession: vi.fn(),
}));

function createToken(expiresAt: number) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1_000) }));
  return `header.${payload}.signature`;
}

function createOptions() {
  const session: AuthSession = {
    token: createToken(Date.now() + 60 * 60 * 1_000),
    user: {
      id: 1,
      clinicaId: 1,
      nome: 'Usuario',
      email: 'usuario@example.com',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    },
  };

  return {
    session,
    persistSession: vi.fn(),
    clearSession: vi.fn(),
    navigate: vi.fn(),
    navigateToDashboard: vi.fn(),
    resetDomains: vi.fn(),
    resetAppChrome: vi.fn(),
    resetModuleMode: vi.fn(),
    resetLoginFlow: vi.fn(),
  };
}

describe('useSessionLifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00Z'));
    vi.mocked(configureAuthSessionRecovery).mockReturnValue(() => undefined);
    vi.mocked(refreshSession).mockResolvedValue({
      token: 'refreshed-token',
      sessionIdleExpiresAt: '2026-07-27T12:30:00Z',
    });
    vi.mocked(recordSessionActivity).mockResolvedValue(undefined);
    vi.mocked(logoutSession).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renova o token quando houve atividade durante a sessao', async () => {
    const options = createOptions();
    renderHook(() => useSessionLifecycle(options));

    await act(() => vi.advanceTimersByTimeAsync(1));
    act(() => window.dispatchEvent(new MouseEvent('mousedown')));
    await act(() => vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS));

    expect(refreshSession).toHaveBeenCalledWith();
    expect(recordSessionActivity).toHaveBeenCalledWith(options.session.token);
    expect(options.persistSession).toHaveBeenCalledWith({
      ...options.session,
      token: 'refreshed-token',
    });
    expect(options.clearSession).not.toHaveBeenCalled();
  });

  it('encerra a sessao depois de 30 minutos sem atividade', async () => {
    const options = createOptions();
    renderHook(() => useSessionLifecycle(options));

    await act(() => vi.advanceTimersByTimeAsync(SESSION_IDLE_TIMEOUT_MS - 1));
    expect(options.clearSession).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(options.clearSession).toHaveBeenCalledOnce();
    expect(options.resetLoginFlow).toHaveBeenCalledWith(
      'Sua sessao expirou. Entre novamente para continuar.',
    );
  });
});
