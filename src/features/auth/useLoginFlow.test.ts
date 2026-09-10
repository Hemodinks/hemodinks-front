import { act, renderHook, waitFor } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate, identifyTeamOperator, listPublicClinics } from '../../services';
import type { LoginResponse, PublicClinic } from '../../types';
import { useLoginFlow } from './useLoginFlow';

vi.mock('../../services', () => ({ authenticate: vi.fn(), identifyTeamOperator: vi.fn(), listPublicClinics: vi.fn(), resetPassword: vi.fn() }));
const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
const login = { id: 10, nome: 'Equipe', email: 'team@example.com', token: 'jwt', clinicaId: 1, perfilId: 6, precisaTrocarSenha: false } as LoginResponse;
const challenge = () => ({ ...login, token: null, equipeDesafio: { token: 'challenge', equipeId: 1, equipeNome: 'Equipe', modoIdentificacao: 'Pin',
  expiraEm: new Date(Date.now() + 300_000).toISOString(), operadores: [{ id: 1, nome: 'Ana', exigePin: true }, { id: 2, nome: 'Bia', exigePin: true }] } }) as LoginResponse;

async function setup() {
  const persistSession = vi.fn();
  const hook = renderHook(() => useLoginFlow({ session: null, persistSession }));
  await waitFor(() => expect(hook.result.current.publicClinicsLoading).toBe(false));
  act(() => { hook.result.current.setLoginClinicValue('1'); hook.result.current.setLoginEmail('team@example.com'); hook.result.current.setLoginPassword('password'); });
  return { ...hook, persistSession };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listPublicClinics).mockResolvedValue([{ id: 1, nome: 'A', slug: 'a' }, { id: 2, nome: 'B', slug: 'b' }] as PublicClinic[]);
});

describe('login state isolation', () => {
  it('ignores a login response after changing clinic and blocks duplicate submissions', async () => {
    let resolve!: (value: LoginResponse) => void;
    vi.mocked(authenticate).mockReturnValue(new Promise(done => { resolve = done; }));
    const { result, persistSession } = await setup();
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleLogin(event); void result.current.handleLogin(event); });
    expect(authenticate).toHaveBeenCalledTimes(1);
    act(() => result.current.setLoginClinicValue('2'));
    await act(async () => { resolve(login); await pending; });
    expect(persistSession).not.toHaveBeenCalled();
    expect(result.current.loginPassword).toBe('');
  });

  it('clears PIN on operator change, failure, cancellation and logout', async () => {
    vi.mocked(authenticate).mockResolvedValue(challenge());
    vi.mocked(identifyTeamOperator).mockRejectedValue(new Error('Credenciais inválidas.'));
    const { result } = await setup();
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
    expect(result.current.loginClinicValue).toBe('');
    expect(result.current.loginEmail).toBe('');
  });

  it('does not persist an identification response after cancellation', async () => {
    vi.mocked(authenticate).mockResolvedValue(challenge());
    let resolve!: (value: LoginResponse) => void;
    vi.mocked(identifyTeamOperator).mockReturnValue(new Promise(done => { resolve = done; }));
    const { result, persistSession } = await setup();
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
    const { result } = await setup();
    await act(() => result.current.handleLogin(event));
    act(() => result.current.setTeamOperatorId('999'));
    await act(() => result.current.handleTeamIdentification(event));
    expect(identifyTeamOperator).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.teamChallenge).toBeNull());
    expect(result.current.loginError).toContain('prazo');
  });
});
