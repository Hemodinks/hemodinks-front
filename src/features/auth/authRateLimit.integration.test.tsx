import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { type FormEvent } from 'react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_EXPIRED_EVENT, apiClient, get, post, registerSessionTokenResolver } from '../../services/api';
import { useLoginFlow } from './useLoginFlow';
import { ResetPasswordScreen } from './ResetPasswordScreen';

const event = { preventDefault() {} } as FormEvent<HTMLFormElement>;
const clinic = { clinicaId: 1, nome: 'Clínica A', slug: 'a' };
const login = { id: 1, nome: 'Ana', email: 'ana@example.com', token: 'jwt', clinicaId: 1, perfilId: 1, precisaTrocarSenha: false };
function response(data: unknown, status = 200, headers = {}): AxiosResponse {
  return { data, status, headers, statusText: '', config: { headers: {} } as AxiosResponse['config'] };
}
function blocked(header?: string, body: object = { retryAfterSeconds: 2 }) {
  return new AxiosError('HTTP error', undefined, undefined, undefined,
    response({ message: 'PRIVATE ACCOUNT DETAILS', ...body }, 429, header ? { 'Retry-After': header } : {}));
}
function setup() {
  const persistSession = vi.fn();
  const hook = renderHook(() => useLoginFlow({ session: null, persistSession }));
  act(() => { hook.result.current.setLoginEmail(login.email); hook.result.current.setLoginPassword('test-password'); });
  return { ...hook, persistSession };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('authentication rate limit integration', () => {
  it.each(['/api/users/login-context', '/api/users/authenticate'])('waits after %s without replaying credentials', async endpoint => {
    let rejected = false;
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async config => {
      if (config.url === endpoint && !rejected) { rejected = true; throw blocked('3'); }
      return response(config.url === '/api/users/login-context' ? { clinicas: [clinic] } : login);
    });
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));
    const calls = request.mock.calls.length;
    expect(result.current.loginError).toBe('Muitas tentativas. Aguarde antes de tentar novamente.');
    expect(result.current.loginPassword).toBe('');
    expect(result.current.loginWaitSeconds).toBe(3);
    act(() => result.current.setLoginPassword('test-password'));
    await act(() => result.current.handleLogin(event));
    expect(request).toHaveBeenCalledTimes(calls);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.loginWaitSeconds).toBe(0);
    expect(result.current.loginWaitMessage).toContain('Espera encerrada');
    expect(request).toHaveBeenCalledTimes(calls);
    await act(() => result.current.handleLogin(event));
    expect(persistSession).toHaveBeenCalledOnce();
  });

  it('keeps waits per normalized email and lets another user be evaluated by the API', async () => {
    const request = vi.spyOn(apiClient, 'request').mockRejectedValue(blocked('30'));
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => { result.current.setLoginEmail('bia@example.com'); result.current.setLoginPassword('test-password'); });
    expect(result.current.loginWaitSeconds).toBe(0);
    await act(() => result.current.handleLogin(event));
    expect(request).toHaveBeenCalledTimes(2);
    act(() => { result.current.setLoginEmail(' ANA@example.com '); result.current.setLoginPassword('test-password'); });
    expect(result.current.loginWaitSeconds).toBe(30);
    await act(() => result.current.handleLogin(event));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps recovery separate from login and guards duplicate reset submissions', async () => {
    let reject!: (error: unknown) => void;
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async config => {
      if (config.url === '/api/public/clinicas') return response([{ id: 1, nome: 'A', slug: 'a' }]);
      if (config.url === '/api/users/password/reset') return new Promise((_, fail) => { reject = fail; });
      return response(config.url === '/api/users/login-context' ? { clinicas: [clinic] } : login);
    });
    const { result, persistSession } = setup();
    let pending!: Promise<void>;
    await act(async () => { pending = result.current.handleResetPassword(); });
    await act(() => result.current.handleResetPassword());
    expect(request.mock.calls.filter(([config]) => config.url === '/api/users/password/reset')).toHaveLength(1);
    await act(async () => { reject(blocked()); await pending; });
    expect(result.current.recoveryWaitSeconds).toBe(2);
    await act(() => result.current.handleResetPassword());
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.current.loginWaitSeconds).toBe(0);
    await act(() => result.current.handleLogin(event));
    expect(persistSession).toHaveBeenCalledOnce();
  });

  it('preserves an operator challenge, clears the PIN and isolates operator waits', async () => {
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async config => {
      if (config.url === '/api/equipe-auth/identificar') throw blocked('2');
      return response(config.url === '/api/users/login-context' ? { clinicas: [clinic] } : {
        ...login, token: null, equipeDesafio: { token: 'challenge', equipeId: 1, equipeNome: 'Equipe', modoIdentificacao: 'Pin',
          expiraEm: new Date(Date.now() + 60_000).toISOString(), operadores: [{ id: 1, nome: 'Ana', exigePin: true }, { id: 2, nome: 'Bia', exigePin: true }] },
      });
    });
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => { result.current.setTeamOperatorId('1'); result.current.setTeamPin('123456'); });
    await act(() => result.current.handleTeamIdentification(event));
    expect(result.current.teamPin).toBe('');
    expect(result.current.teamChallenge).not.toBeNull();
    expect(result.current.teamWaitSeconds).toBe(2);
    act(() => result.current.setTeamOperatorId('2'));
    expect(result.current.teamWaitSeconds).toBe(0);
    act(() => { result.current.setTeamOperatorId('1'); result.current.setTeamPin('123456'); });
    await act(() => result.current.handleTeamIdentification(event));
    expect(request).toHaveBeenCalledTimes(3);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(request).toHaveBeenCalledTimes(3);
    await act(() => result.current.handleTeamIdentification(event));
    expect(request).toHaveBeenCalledTimes(4);
    expect(persistSession).not.toHaveBeenCalled();
  });

  it('allows a manual retry without a fabricated countdown when no valid deadline is provided', async () => {
    const request = vi.spyOn(apiClient, 'request').mockRejectedValue(blocked(undefined, {}));
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    expect(result.current.loginWaitSeconds).toBe(0);
    expect(result.current.loginError).not.toContain('PRIVATE');
    act(() => result.current.setLoginPassword('test-password'));
    await act(() => result.current.handleLogin(event));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not transfer an operator wait to a new challenge or clinic', async () => {
    let challenges = 0;
    const request = vi.spyOn(apiClient, 'request').mockImplementation(async config => {
      if (config.url === '/api/equipe-auth/identificar') throw blocked('30');
      if (config.url === '/api/users/login-context') return response({ clinicas: [{ ...clinic, slug: challenges ? 'b' : 'a' }] });
      return response({ ...login, token: null, equipeDesafio: {
        token: `challenge-${++challenges}`, equipeId: challenges, equipeNome: 'Equipe', modoIdentificacao: 'Pin',
        expiraEm: new Date(Date.now() + 60_000).toISOString(), operadores: [{ id: 1, nome: 'Ana', exigePin: true }],
      } });
    });
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => { result.current.setTeamOperatorId('1'); result.current.setTeamPin('123456'); });
    await act(() => result.current.handleTeamIdentification(event));
    expect(result.current.teamWaitSeconds).toBe(30);
    act(() => { result.current.cancelTeamIdentification(); result.current.setLoginPassword('test-password'); });
    await act(() => result.current.handleLogin(event));
    act(() => { result.current.setTeamOperatorId('1'); result.current.setTeamPin('123456'); });
    expect(result.current.teamWaitSeconds).toBe(0);
    await act(() => result.current.handleTeamIdentification(event));
    expect(request.mock.calls.filter(([config]) => config.url === '/api/equipe-auth/identificar')).toHaveLength(2);
    expect(request.mock.calls.at(-1)?.[0].headers).toMatchObject({ 'X-Clinica-Slug': 'b' });
  });

  it.each(['GET', 'POST'])('does not expire or refresh a session or replay a protected %s on 429', async method => {
    const expired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    const resolver = vi.fn(async (token: string) => token);
    const unregister = registerSessionTokenResolver(resolver);
    const request = vi.spyOn(apiClient, 'request').mockRejectedValue(blocked('2'));
    try {
      await expect(method === 'GET' ? get('/protected', 'jwt') : post('/protected', {}, 'jwt')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 2 });
      expect(expired).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledOnce();
      expect(resolver).toHaveBeenCalledExactlyOnceWith('jwt', false);
    } finally { unregister(); window.removeEventListener(AUTH_EXPIRED_EVENT, expired); }
  });

  it('guards confirmation writes synchronously and releases the button without resubmitting', async () => {
    let reject!: (error: unknown) => void;
    const request = vi.spyOn(apiClient, 'request').mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const completed = vi.fn();
    render(<ResetPasswordScreen companyName="HemoDinks" theme="light" token="test-reset-token" onThemeToggle={vi.fn()} onBackToLogin={vi.fn()} onResetCompleted={completed} />);
    fireEvent.change(screen.getByLabelText('Nova senha', { exact: true }), { target: { value: 'test-password' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha', { exact: true }), { target: { value: 'test-password' } });
    const submit = screen.getByRole('button', { name: 'Redefinir senha' });
    act(() => { fireEvent.submit(submit.closest('form')!); fireEvent.submit(submit.closest('form')!); });
    expect(request).toHaveBeenCalledOnce();
    await act(async () => reject(blocked('2')));
    expect(submit).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(submit).toBeEnabled();
    expect(request).toHaveBeenCalledOnce();
    expect(completed).not.toHaveBeenCalled();
  });
});
