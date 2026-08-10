import type { AuthSession, LoginResponse, SelectClinicResponse } from "../types";
import {
  CONTROLLER_PROFILE_ID,
  DEFAULT_PROFILE_ID,
  formatProfileName,
  MEDICAL_PROFILE_ID,
} from "../shared/utils/formatters";

export function shouldOpenDashboardAfterLogin(perfilId: number) {
  return perfilId === MEDICAL_PROFILE_ID || perfilId === CONTROLLER_PROFILE_ID;
}

export function buildSessionFromLogin(
  result: LoginResponse,
): AuthSession {
  if (!result.token) {
    throw new Error("Token de acesso ausente na resposta de login.");
  }
  const resultPerfilId = result.perfilId || DEFAULT_PROFILE_ID;

  return {
    token: result.token,
    user: {
      id: result.id,
      clinicaId: result.clinicaId,
      clinicaSlug: result.clinicaSlug ?? null,
      nome: result.nome,
      email: result.email,
      cpf: result.cpf ?? null,
      crm: result.crm ?? null,
      crmUf: result.crmUf ?? null,
      fotoPerfil: result.fotoPerfil ?? null,
      precisaTrocarSenha: result.precisaTrocarSenha,
      precisaTrocarPin: result.precisaTrocarPin ?? false,
      perfilId: resultPerfilId,
      perfilNome: formatProfileName(resultPerfilId, result.perfilNome),
      modulosLiberados: result.modulosLiberados,
      licenca: result.licenca ?? null,
    },
  };
}

export function getResetPasswordCompletedMessage(message: string) {
  return /nova senha/i.test(message)
    ? message
    : `${message}. Entre com a nova senha.`;
}

export function buildSessionForSelectedClinic(session: AuthSession, result: SelectClinicResponse): AuthSession {
  return {
    token: result.token,
    user: {
      ...session.user,
      id: result.clinica.userId,
      clinicaId: result.clinica.clinicaId,
      clinicaSlug: result.clinica.slug,
      perfilId: result.clinica.perfilId,
      perfilNome: result.clinica.perfil,
      modulosLiberados: result.clinica.modulosLiberados,
    },
  };
}
