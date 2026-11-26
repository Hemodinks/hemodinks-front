import { act, renderHook, waitFor } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate, completeMfaLogin, resolveLoginClinics } from '../../services';
import type { LoginResponse } from '../../types';
import { useLoginFlow } from './useLoginFlow';
import { ApiError } from '../../services/api';

vi.mock('../../services', () => ({
  authenticate: vi.fn(),
  completeMfaLogin: vi.fn(),
  identifyTeamOperator: vi.fn(),
  listPublicClinics: vi.fn(),
  resetPassword: vi.fn(),
  resolveLoginClinics: vi.fn(),
}));

const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
const login = { id: 10, nome: 'Admin', email: 'admin@example.com', token: 'jwt', clinicaId: 1, perfilId: 1, precisaTrocarSenha: false } as LoginResponse;
const mfaChallenge = (ms = 300_000) =>
  ({ mfaDesafio: { token: 'mfa-challenge', expiraEm: new Date(Date.now() + ms).toISOString() } }) as unknown as LoginResponse;

function setup() {
  const persistSession = vi.fn();
  const hook = renderHook(() => useLoginFlow({ session: null, persistSession }));
  act(() => {
    hook.result.current.setLoginEmail('admin@example.com');
    hook.result.current.setLoginPassword('password');
  });
  return { ...hook, persistSession };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(resolveLoginClinics).mockResolvedValue({ clinicas: [{ clinicaId: 1, nome: 'A', slug: 'a' }] });
});

describe('login with two-step verification (#150)', () => {
  it('asks for the code and only opens the session after the second factor', async () => {
    vi.mocked(authenticate).mockResolvedValue(mfaChallenge());
    vi.mocked(completeMfaLogin).mockResolvedValue(login);
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));

    expect(result.current.mfaChallenge?.token).toBe('mfa-challenge');
    expect(result.current.loginPassword).toBe('');
    expect(persistSession).not.toHaveBeenCalled();

    act(() => result.current.setMfaCode('12 34-56'));
    expect(result.current.mfaCode).toBe('123456');
    // So digitos: nunca passa de 6, nem colando mais.
    act(() => result.current.setMfaCode('33333333333'));
    expect(result.current.mfaCode).toBe('333333');
    // Com letras: codigo de recuperacao, 10 caracteres com hifen automatico.
    act(() => result.current.setMfaCode('abcde fghij klm'));
    expect(result.current.mfaCode).toBe('ABCDE-FGHIJ');
    act(() => result.current.setMfaCode('123456'));
    await act(() => result.current.handleMfaVerification(event));

    expect(completeMfaLogin).toHaveBeenCalledWith('mfa-challenge', '123456', 'a', expect.any(AbortSignal));
    expect(persistSession).toHaveBeenCalledTimes(1);
    expect(result.current.mfaChallenge).toBeNull();
  });

  it('accepts a recovery code and rejects malformed codes without calling the API', async () => {
    vi.mocked(authenticate).mockResolvedValue(mfaChallenge());
    vi.mocked(completeMfaLogin).mockResolvedValue(login);
    const { result } = setup();
    await act(() => result.current.handleLogin(event));

    act(() => result.current.setMfaCode('1234'));
    await act(() => result.current.handleMfaVerification(event));
    expect(completeMfaLogin).not.toHaveBeenCalled();
    expect(result.current.loginError).toContain('6 dígitos');

    act(() => result.current.setMfaCode('ABCDE-FGHIJ'));
    await act(() => result.current.handleMfaVerification(event));
    expect(completeMfaLogin).toHaveBeenCalledWith('mfa-challenge', 'ABCDE-FGHIJ', 'a', expect.any(AbortSignal));
  });

  it('keeps the challenge after a wrong code and clears the typed code', async () => {
    vi.mocked(authenticate).mockResolvedValue(mfaChallenge());
    vi.mocked(completeMfaLogin).mockRejectedValue(new ApiError('Codigo invalido', 401));
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => result.current.setMfaCode('000000'));
    await act(() => result.current.handleMfaVerification(event));

    expect(persistSession).not.toHaveBeenCalled();
    expect(result.current.mfaChallenge).not.toBeNull();
    expect(result.current.mfaCode).toBe('');
    expect(result.current.loginError).toContain('Código inválido');
  });

  it('drops the challenge when it expires and on back', async () => {
    vi.mocked(authenticate).mockResolvedValue(mfaChallenge(150));
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    await waitFor(() => expect(result.current.mfaChallenge).toBeNull());
    expect(result.current.loginError).toContain('prazo');

    vi.mocked(authenticate).mockResolvedValue(mfaChallenge());
    act(() => result.current.setLoginPassword('password'));
    await act(() => result.current.handleLogin(event));
    expect(result.current.mfaChallenge).not.toBeNull();
    act(() => result.current.cancelTeamIdentification());
    expect(result.current.mfaChallenge).toBeNull();
    expect(completeMfaLogin).not.toHaveBeenCalled();
  });
});
