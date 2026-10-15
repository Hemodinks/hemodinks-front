import { createElement, StrictMode, type PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';
import type { AuthSession } from '../../types';
import { TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import { normalizeTeamPinRequirement } from './useAuthSession';

function createJwtToken(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function createTeamSession(identificacaoConfiavel: boolean): AuthSession {
  return {
    token: createJwtToken({ identificacaoConfiavel }),
    user: {
      id: 8,
      clinicaId: 1,
      clinicaSlug: 'hemodinks',
      nome: 'Equipe',
      email: 'equipe@example.com',
      cpf: null,
      crm: null,
      crmUf: null,
      fotoPerfil: null,
      precisaTrocarSenha: false,
      precisaTrocarPin: true,
      perfilId: TEAM_PROFILE_ID,
      perfilNome: 'Equipe',
      modulosLiberados: [],
      licenca: null,
    },
  };
}

describe('normalizeTeamPinRequirement', () => {
  it('ignora troca de PIN pendente quando a equipe entrou sem PIN nominal', () => {
    expect(normalizeTeamPinRequirement(createTeamSession(false)).user.precisaTrocarPin).toBe(false);
  });

  it('mantem a troca obrigatoria quando a identificação ocorreu com PIN', () => {
    expect(normalizeTeamPinRequirement(createTeamSession(true)).user.precisaTrocarPin).toBe(true);
  });
});

// Storage must not become a credential source, including during migration.
import { act, renderHook, waitFor } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { useAuthSession } from './useAuthSession';
import { queryClient } from '../../queryClient';
import { sessionEpoch } from '../../services/sessionEpoch';
import { restoreSession } from '../../services/sessionService';
vi.mock('../../services/sessionService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/sessionService')>(),
  restoreSession: vi.fn().mockResolvedValue(null), revokeSession: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => { sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); });

it('keeps successful authentication only in memory', () => {
  const { result } = renderHook(() => useAuthSession());
  const session = createTeamSession(true);
  act(() => result.current.persistSession(session));
  expect(result.current.session?.token).toBe(session.token);
  expect(sessionStorage.getItem('hemodinks.session')).toBeNull();
  expect(localStorage.getItem('hemodinks.session')).toBeNull();
});

it('deletes legacy credentials and never trusts an injected stored profile', async () => {
  const injected = createTeamSession(true);
  sessionStorage.setItem('hemodinks.session', JSON.stringify(injected));
  localStorage.setItem('hemodinks.session', JSON.stringify(injected));
  const { result } = renderHook(() => useAuthSession());
  await waitFor(() => expect(result.current.session).toBeNull());
  expect(sessionStorage.getItem('hemodinks.session')).toBeNull();
  expect(localStorage.getItem('hemodinks.session')).toBeNull();
});

it('does not restore a late bootstrap response after local logout', async () => {
  let complete!: (value: import('../../types').LoginResponse) => void;
  vi.mocked(restoreSession).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  const { result } = renderHook(() => useAuthSession());
  act(() => result.current.clearSession());
  await act(async () => complete({ ...createTeamSession(true).user, token: createTeamSession(true).token }));
  expect(result.current.session).toBeNull();
});

it('does not replace a newer session with a delayed bootstrap response', async () => {
  let complete!: (value: import('../../types').LoginResponse) => void;
  vi.mocked(restoreSession).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  const { result } = renderHook(() => useAuthSession());
  const newer = createTeamSession(true);
  act(() => result.current.persistSession(newer));
  expect(result.current.restoring).toBe(true);
  await act(async () => complete({ ...createTeamSession(false).user, token: createTeamSession(false).token }));
  expect(result.current.session).toEqual(newer);
  expect(result.current.restoring).toBe(false);
});

it('restores once under StrictMode instead of queueing a second cookie rotation', async () => {
  const wrapper = ({ children }: PropsWithChildren) => createElement(StrictMode, null, children);
  const { result } = renderHook(() => useAuthSession(), { wrapper });
  await waitFor(() => expect(result.current.restoring).toBe(false));
  expect(restoreSession).toHaveBeenCalledTimes(1);
});

it('discards a bootstrap response when another tab logs out while restoration is pending', async () => {
  let notify!: (event: { data: unknown }) => void;
  class Channel {
    set onmessage(handler: typeof notify) { notify = handler; }
    postMessage() {} close() {}
  }
  vi.stubGlobal('BroadcastChannel', Channel);
  let complete!: (value: import('../../types').LoginResponse) => void;
  vi.mocked(restoreSession).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  try {
    const { result } = renderHook(() => useAuthSession());
    act(() => notify({ data: { type: 'invalidate', context: '["revoked-session",1]' } }));
    expect(result.current.restoring).toBe(true);
    await act(async () => complete({ ...createTeamSession(true).user, token: createTeamSession(true).token }));
    expect(result.current.session).toBeNull();
  } finally { vi.unstubAllGlobals(); }
});

it('clears private cache when a team operator changes within the same clinic and account', async () => {
  const { result } = renderHook(() => useAuthSession());
  await waitFor(() => expect(result.current.restoring).toBe(false));
  const session = { ...createTeamSession(true), token: createJwtToken({ equipeId: 8, equipeOperadorId: 1, auth_time: 100 }) };
  act(() => result.current.persistSession(session));
  const epoch = sessionEpoch();
  queryClient.setQueryData(['pacientes', session.token], ['private operator data']);
  act(() => result.current.persistSession({ ...session, token: createJwtToken({ equipeId: 8, equipeOperadorId: 2, auth_time: 101 }) }));
  expect(sessionEpoch()).toBeGreaterThan(epoch);
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});

it('preserves the context and cache during ordinary access-token renewal', async () => {
  const { result } = renderHook(() => useAuthSession());
  await waitFor(() => expect(result.current.restoring).toBe(false));
  const claims = { sid: 'session-a', usuarioGlobalId: 3, usuarioClinicaId: 8, exp: 100 };
  const session = { ...createTeamSession(true), token: createJwtToken(claims) };
  act(() => result.current.persistSession(session));
  const epoch = sessionEpoch();
  queryClient.setQueryData(['pacientes', session.token], ['authorized data']);
  act(() => result.current.persistSession({ ...session, token: createJwtToken({ ...claims, exp: 200 }) }));
  expect(sessionEpoch()).toBe(epoch);
  expect(queryClient.getQueryData(['pacientes', session.token])).toEqual(['authorized data']);
});

it('does not invalidate a different team operator when a tab signs out without sid', async () => {
  const channels: Array<{ onmessage?: (event: { data: unknown }) => void; messages: unknown[] }> = [];
  class Channel {
    onmessage?: (event: { data: unknown }) => void;
    messages: unknown[] = [];
    constructor() { channels.push(this); }
    postMessage(message: unknown) { this.messages.push(message); }
    close() {}
  }
  vi.stubGlobal('BroadcastChannel', Channel);
  try {
    const first = renderHook(() => useAuthSession());
    const second = renderHook(() => useAuthSession());
    await waitFor(() => expect(first.result.current.restoring || second.result.current.restoring).toBe(false));
    const a = { ...createTeamSession(true), token: createJwtToken({ equipeId: 8, equipeOperadorId: 1, auth_time: 100 }) };
    const b = { ...a, token: createJwtToken({ equipeId: 8, equipeOperadorId: 2, auth_time: 200 }) };
    act(() => first.result.current.persistSession(a));
    act(() => second.result.current.persistSession(b));
    act(() => second.result.current.clearSession());
    act(() => channels[0].onmessage?.({ data: channels[1].messages.at(-1) }));
    expect(first.result.current.session).toEqual(a);
  } finally { vi.unstubAllGlobals(); }
});
