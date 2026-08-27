import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as services from '../../services';
import { mockSession } from '../../test/appTestData';
import type { Team, TeamEligibleUser } from '../../types';
import { useClinicTeams } from './useClinicTeams';

vi.mock('../../services', () => ({
  addPlatformClinicTeamMember: vi.fn(),
  listPlatformClinicTeams: vi.fn(),
  listPlatformClinicTeamUsers: vi.fn(),
  removePlatformClinicTeamMember: vi.fn(),
  resetPlatformClinicTeamOperatorPin: vi.fn(),
  updatePlatformClinicTeam: vi.fn(),
}));

const team: Team = {
  id: 10,
  nome: 'Equipe cirúrgica',
  usuarioLoginId: 20,
  email: 'equipe@hemodinks.com',
  modoIdentificacao: 'Pin',
  ativa: true,
  membros: [],
};

const eligibleUser: TeamEligibleUser = {
  usuarioGlobalId: 30,
  userIdNaClinica: null,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  perfilId: 2,
  perfilNome: 'Médicos',
  origemClinica: 'Clínica origem',
  cadastradoNaClinica: false,
};

describe('useClinicTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(services.listPlatformClinicTeams).mockResolvedValue([team]);
    vi.mocked(services.listPlatformClinicTeamUsers).mockResolvedValue([eligibleUser]);
    vi.mocked(services.addPlatformClinicTeamMember).mockResolvedValue({
      associados: [{ userId: 40, nome: eligibleUser.nome, operadorId: 50, pinTemporario: '123456', importado: true }],
    });
    vi.mocked(services.resetPlatformClinicTeamOperatorPin).mockResolvedValue({ pinTemporario: '654321' });
    vi.mocked(services.updatePlatformClinicTeam).mockResolvedValue(undefined);
    vi.mocked(services.removePlatformClinicTeamMember).mockResolvedValue(undefined);
  });

  it('preserva a associacao e mantem o PIN temporario oculto por padrao', async () => {
    const session = mockSession();
    const { result } = renderHook(() => useClinicTeams({ session, clinicId: 7 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectUser(team.id, eligibleUser));
    await act(async () => result.current.associate(team));

    expect(services.addPlatformClinicTeamMember).toHaveBeenCalledWith(
      7,
      team.id,
      [eligibleUser.usuarioGlobalId],
      [],
      [],
      true,
      session.token,
    );
    expect(result.current.temporaryPins[50]).toBe('123456');
    expect(result.current.visiblePins[50]).toBe(false);
  });

  it('remove PINs temporarios da memoria ao desativar o modo PIN', async () => {
    const session = mockSession();
    const teamWithMember: Team = {
      ...team,
      membros: [{ userId: 40, nome: 'Ana', email: eligibleUser.email, perfilId: 2, operadorId: 50, operadorAtivo: true, possuiPin: true, precisaTrocarPin: false }],
    };
    const { result } = renderHook(() => useClinicTeams({ session, clinicId: 7 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.resetPin(teamWithMember, 50));
    expect(result.current.temporaryPins[50]).toBe('654321');

    await act(async () => result.current.changeMode(teamWithMember, 'Selecao'));
    expect(result.current.temporaryPins[50]).toBeUndefined();
    expect(result.current.visiblePins[50]).toBeUndefined();
  });
});
