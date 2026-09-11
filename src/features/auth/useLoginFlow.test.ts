import { act, renderHook, waitFor } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate, identifyTeamOperator, listPublicClinics, resolveLoginClinics } from '../../services';
import type { LoginResponse, PublicClinic } from '../../types';
import { useLoginFlow } from './useLoginFlow';
import { ApiError } from '../../services/api';

vi.mock('../../services', () => ({
  authenticate: vi.fn(),
  identifyTeamOperator: vi.fn(),
  listPublicClinics: vi.fn(),
  resetPassword: vi.fn(),
  resolveLoginClinics: vi.fn(),
}));

const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
const login = { id: 10, nome: 'Equipe', email: 'team@example.com', token: 'jwt', clinicaId: 1, perfilId: 6, precisaTrocarSenha: false } as LoginResponse;
const clinicA = { clinicaId: 1, nome: 'A', slug: 'a' };
const clinicB = { clinicaId: 2, nome: 'B', slug: 'b' };
const challenge = () => ({ ...login, token: null, equipeDesafio: { token: 'challenge', equipeId: 1, equipeNome: 'Equipe', modoIdentificacao: 'Pin',
  expiraEm: new Date(Date.now() + 300_000).toISOString(), operadores: [{ id: 1, nome: 'Ana', exigePin: true }, { id: 2, nome: 'Bia', exigePin: true }] } }) as LoginResponse;

function setup() {
  const persistSession = vi.fn();
  const hook = renderHook(() => useLoginFlow({ session: null, persistSession }));
  act(() => {
    hook.result.current.setLoginEmail('team@example.com');
    hook.result.current.setLoginPassword('password');
  });
  return { ...hook, persistSession };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(resolveLoginClinics).mockResolvedValue({ clinicas: [clinicA] });
  vi.mocked(listPublicClinics).mockResolvedValue([{ id: 1, nome: 'A', slug: 'a' }, { id: 2, nome: 'B', slug: 'b' }] as PublicClinic[]);
});

describe('login state isolation', () => {
  it('aborts a slow request and ignores its late response after cancellation', async () => {
    let resolve!: (value: { clinicas: Array<typeof clinicA> }) => void;
    vi.mocked(resolveLoginClinics).mockReturnValue(new Promise(done => { resolve = done; }));
    const { result, persistSession } = setup();
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleLogin(event); });
    const signal = vi.mocked(resolveLoginClinics).mock.calls[0][2]!;
    act(() => result.current.cancelPendingLogin());
    expect(signal.aborted).toBe(true);
    expect(result.current.loginLoading).toBe(false);
    expect(result.current.loginPassword).toBe('');
    expect(result.current.loginInfo).toContain('cancelada');
    await act(async () => { resolve({ clinicas: [clinicA] }); await pending; });
    expect(authenticate).not.toHaveBeenCalled();
    expect(persistSession).not.toHaveBeenCalled();
    expect(result.current.loginError).toBe('');
  });

  it('explains a timeout without automatically replaying credentials', async () => {
    vi.mocked(resolveLoginClinics).mockRejectedValue(new ApiError('timeout', undefined, 'ECONNABORTED'));
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    expect(result.current.loginError).toContain('Isso não significa');
    expect(result.current.loginLoading).toBe(false);
    expect(result.current.loginPassword).toBe('');
    expect(resolveLoginClinics).toHaveBeenCalledTimes(1);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('enters directly when credentials have exactly one clinic', async () => {
    vi.mocked(authenticate).mockResolvedValue(login);
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));
    expect(resolveLoginClinics).toHaveBeenCalledWith('team@example.com', 'password', expect.any(AbortSignal));
    expect(authenticate).toHaveBeenCalledWith('team@example.com', 'password', 'a', expect.any(AbortSignal));
    expect(persistSession).toHaveBeenCalledTimes(1);
    expect(result.current.loginClinicOptions).toEqual([]);
    expect(result.current.loginPassword).toBe('');
  });

  it('asks for clinic only after valid credentials when more than one is available', async () => {
    vi.mocked(resolveLoginClinics).mockResolvedValue({ clinicas: [clinicA, clinicB] });
    vi.mocked(authenticate).mockResolvedValue({ ...login, clinicaId: 2 });
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));
    expect(authenticate).not.toHaveBeenCalled();
    expect(result.current.loginClinicOptions).toHaveLength(2);
    expect(result.current.loginPassword).toBe('password');

    await act(() => result.current.selectLoginClinic(2));
    expect(authenticate).toHaveBeenCalledWith('team@example.com', 'password', 'b', expect.any(AbortSignal));
    expect(persistSession).toHaveBeenCalledTimes(1);
    expect(result.current.loginPassword).toBe('');
  });

  it('invalidates an in-flight login when the email changes and blocks duplicate submissions', async () => {
    let resolve!: (value: { clinicas: Array<typeof clinicA> }) => void;
    vi.mocked(resolveLoginClinics).mockReturnValue(new Promise(done => { resolve = done; }));
    const { result, persistSession } = setup();
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleLogin(event); void result.current.handleLogin(event); });
    expect(resolveLoginClinics).toHaveBeenCalledTimes(1);
    act(() => result.current.setLoginEmail('other@example.com'));
    await act(async () => { resolve({ clinicas: [clinicA] }); await pending; });
    expect(authenticate).not.toHaveBeenCalled();
    expect(persistSession).not.toHaveBeenCalled();
  });

  it('clears PIN on operator change, failure, cancellation and logout', async () => {
    vi.mocked(authenticate).mockResolvedValue(challenge());
    vi.mocked(identifyTeamOperator).mockRejectedValue(new Error('Credenciais inválidas.'));
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => result.current.setTeamOperatorId('1'));
    act(() => result.current.setTeamPin('123456'));
    act(() => result.current.setTeamOperatorId('2'));
    expect(result.current.teamPin).toBe('');
    act(() => result.current.setTeamPin('123456'));
    await act(() => result.current.handleTeamIdentification(event));
    expect(result.current.teamPin).toBe('');
    expect(result.current.teamChallenge).not.toBeNull();
    act(() => result.current.cancelTeamIdentification());
    expect(result.current.teamOperatorId).toBe('');
    expect(result.current.teamChallenge).toBeNull();
    act(() => result.current.resetLoginState());
    expect(result.current.loginEmail).toBe('');
    expect(result.current.loginClinicOptions).toEqual([]);
  });

  it('does not persist an identification response after cancellation', async () => {
    vi.mocked(authenticate).mockResolvedValue(challenge());
    let resolve!: (value: LoginResponse) => void;
    vi.mocked(identifyTeamOperator).mockReturnValue(new Promise(done => { resolve = done; }));
    const { result, persistSession } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => result.current.setTeamOperatorId('1'));
    act(() => result.current.setTeamPin('123456'));
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleTeamIdentification(event); });
    act(() => result.current.cancelTeamIdentification());
    await act(async () => { resolve(login); await pending; });
    expect(persistSession).not.toHaveBeenCalled();
    expect(result.current.teamChallenge).toBeNull();
  });

  it('expires the challenge and rejects operator IDs outside its list', async () => {
    const response = challenge();
    response.equipeDesafio!.expiraEm = new Date(Date.now() + 150).toISOString();
    vi.mocked(authenticate).mockResolvedValue(response);
    const { result } = setup();
    await act(() => result.current.handleLogin(event));
    act(() => result.current.setTeamOperatorId('999'));
    await act(() => result.current.handleTeamIdentification(event));
    expect(identifyTeamOperator).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.teamChallenge).toBeNull());
    expect(result.current.loginError).toContain('prazo');
  });
});
