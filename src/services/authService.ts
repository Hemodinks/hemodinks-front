import type { LoginResponse } from "../types";
import { post } from "./api";

export type ResetPasswordResponse = {
  id?: number;
  precisaTrocarSenha?: boolean;
  message: string;
  mode?: string | null;
};

export function authenticate(
  email: string,
  senha: string,
  clinicaSlug?: string,
) {
  return post<LoginResponse>(
    "/api/users/authenticate",
    { email, senha },
    undefined,
    {
      headers: clinicaSlug ? { "X-Clinica-Slug": clinicaSlug } : undefined,
    },
  );
}

export function identifyTeamOperator(
  token: string,
  operadorId: number,
  pin: string | null,
  clinicaSlug?: string,
) {
  return post<LoginResponse>(
    "/api/equipe-auth/identificar",
    { token, operadorId, pin },
    undefined,
    {
      headers: clinicaSlug ? { "X-Clinica-Slug": clinicaSlug } : undefined,
    },
  );
}

export function resetPassword(email: string, clinicaSlug?: string) {
  return post<ResetPasswordResponse>(
    "/api/users/password/reset",
    { email },
    undefined,
    {
      headers: clinicaSlug ? { "X-Clinica-Slug": clinicaSlug } : undefined,
    },
  );
}

export function confirmPasswordReset(token: string, novaSenha: string) {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  return post<{ id: number; precisaTrocarSenha: boolean; message: string }>(
    "/api/users/password/reset/confirm",
    { token, novaSenha },
    undefined,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
}
