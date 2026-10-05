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
import { restoreSession } from '../../services/sessionService';
vi.mock('../../services/sessionService', () => ({
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
    await act(async () => complete({ ...createTeamSession(true).user, token: createTeamSession(true).token }));
    expect(result.current.session).toBeNull();
  } finally { vi.unstubAllGlobals(); }
});
