import type { LoginResponse } from "../types";
import { post } from "./api";

export type ResetPasswordResponse = {
  id?: number;
  precisaTrocarSenha?: boolean;
  message: string;
  mode?: string | null;
};

export type LoginClinicOption = {
  clinicaId: number;
  nome: string;
  slug: string;
};

export type ResolveLoginClinicsResponse = {
  clinicas: LoginClinicOption[];
};

// The first login request can include service startup; subsequent authentication steps keep their existing limit.
export const LOGIN_CONTEXT_TIMEOUT_MS = 120_000;

export function resolveLoginClinics(email: string, senha: string, signal?: AbortSignal) {
  return post<ResolveLoginClinicsResponse>(
    "/api/users/login-context",
    { email, senha },
    undefined,
    { timeout: LOGIN_CONTEXT_TIMEOUT_MS, ...(signal ? { signal } : {}) },
  );
}

export function authenticate(
  email: string,
  senha: string,
  clinicaSlug?: string,
  signal?: AbortSignal,
) {
  return post<LoginResponse>(
    "/api/users/authenticate",
    { email, senha },
    undefined,
    {
      timeout: 60_000,
      ...(signal ? { signal } : {}),
      headers: clinicaSlug ? { "X-Clinica-Slug": clinicaSlug } : undefined,
    },
  );
}

export function identifyTeamOperator(
  token: string,
  operadorId: number,
  pin: string | null,
  clinicaSlug?: string,
  signal?: AbortSignal,
) {
  return post<LoginResponse>(
    "/api/equipe-auth/identificar",
    { token, operadorId, pin },
    undefined,
    {
      timeout: 60_000,
      ...(signal ? { signal } : {}),
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
