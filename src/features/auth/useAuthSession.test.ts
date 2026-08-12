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
