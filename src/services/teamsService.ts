import type { CreateTeamPayload, Team, TeamEligibleUser, TeamIdentificationMode } from "../types";
import { del, get, post, put } from "./api";

export function listTeams(token: string) {
  return get<Team[]>("/api/equipes/", token);
}

export function changeCurrentTeamPin(
  pinAtual: string,
  novoPin: string,
  token: string,
) {
  return put<{ token: string; precisaTrocarPin: boolean }>(
    "/api/equipe-auth/pin",
    { pinAtual, novoPin },
    token,
  );
}

export function listPlatformClinicTeams(clinicId: number, token: string) {
  return get<Team[]>(`/api/platform/clinicas/${clinicId}/equipes`, token);
}

export function listPlatformClinicTeamUsers(clinicId: number, token: string) {
  return get<TeamEligibleUser[]>(
    `/api/platform/clinicas/${clinicId}/equipes/usuarios`,
    token,
  );
}

export function updatePlatformClinicTeam(
  clinicId: number,
  teamId: number,
  payload: { modoIdentificacao: TeamIdentificationMode },
  token: string,
) {
  return put<void>(
    `/api/platform/clinicas/${clinicId}/equipes/${teamId}`,
    payload,
    token,
  );
}

export function addPlatformClinicTeamMember(
  clinicId: number,
  teamId: number,
  usuarioGlobalIds: number[],
  userIds: number[],
  novosUsuarios: Array<{ nome: string; telefone?: string | null }>,
  gerarPin: boolean,
  token: string,
) {
  return post<{
    associados: Array<{
      userId: number;
      nome: string;
      operadorId: number;
      pinTemporario?: string | null;
      importado: boolean;
    }>;
  }>(
    `/api/platform/clinicas/${clinicId}/equipes/${teamId}/membros`,
    { usuarioGlobalIds, userIds, novosUsuarios, gerarPin },
    token,
  );
}

export function removePlatformClinicTeamMember(
  clinicId: number,
  teamId: number,
  userId: number,
  token: string,
) {
  return del<void>(
    `/api/platform/clinicas/${clinicId}/equipes/${teamId}/membros/${userId}`,
    token,
  );
}

export function resetPlatformClinicTeamOperatorPin(
  clinicId: number,
  teamId: number,
  operatorId: number,
  token: string,
) {
  return post<{ pinTemporario: string }>(
    `/api/platform/clinicas/${clinicId}/equipes/${teamId}/operadores/${operatorId}/pin`,
    {},
    token,
  );
}
