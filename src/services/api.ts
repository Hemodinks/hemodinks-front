import { readPasswordPolicyError } from './passwordPolicyError';
import { readSensitiveIdentityError } from './sensitiveIdentityError';
import { readSessionFailureCode, SESSION_ABSOLUTE_EXPIRED_CODE, SESSION_ABSOLUTE_EXPIRED_MESSAGE } from './sessionExpiration';
import { sessionEpoch } from './sessionEpoch';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { resolveClinicaRequestHeaders } from './clinicaContext';
import { isJwtExpired } from '../shared/utils/jwt';
import { readRetryAfter } from './retryAfter';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const DEFAULT_ERROR_MESSAGE = 'Nao foi possivel concluir a operacao.';
const SERVICE_UNAVAILABLE_ERROR_MESSAGE = 'Sistema temporariamente indisponível. Tente novamente mais tarde.';
const MAINTENANCE_ERROR_MESSAGE = 'Sistema temporariamente indisponível das 00:00 às 06:59 para manutenção dos dados.';
const SERVICE_UNAVAILABLE_STATUS_CODES = new Set([502, 503, 504]);
// 503 da API quando o banco serverless está retomando após pausa por inatividade.
export const DATABASE_UNAVAILABLE_CODE = 'database_unavailable';
const DATABASE_UNAVAILABLE_ERROR_MESSAGE = 'O sistema está retomando após um período sem uso. Aguarde alguns segundos e tente novamente.';
// A retomada do banco leva até cerca de um minuto; leituras esperam esse tempo sem mostrar erro.
export const DATABASE_RETRY_BUDGET_MS = 60_000;
const DATABASE_RETRY_DEFAULT_SECONDS = 5;
const DATABASE_RETRY_MAX_SECONDS = 10;
// Só métodos sem efeito colateral: o 503 também cobre queda de conexão depois de um commit.
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const UNAUTHORIZED_ERROR_MESSAGE = 'Credenciais invalidas ou sessao expirada.';
const FORBIDDEN_ERROR_MESSAGE = 'Operação não permitida.';
export const AUTH_EXPIRED_EVENT = 'hemodinks:auth-expired';
export const API_READ_TIMEOUT_MS = 60_000;

type RequestConfig = Omit<AxiosRequestConfig, 'data' | 'method' | 'url'>;

type SessionTokenResolver = (token: string, force: boolean) => Promise<string>;
let sessionTokenResolver: SessionTokenResolver | null = null;
export function registerSessionTokenResolver(resolver: SessionTokenResolver) {
  sessionTokenResolver = resolver;
  return () => { if (sessionTokenResolver === resolver) sessionTokenResolver = null; };
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string, readonly retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = axios.create({
  baseURL: API_URL,
});

export const publicApiClient = axios.create();

function buildJsonHeaders(token?: string, headers?: AxiosRequestConfig['headers']) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...resolveClinicaRequestHeaders(token),
    ...(headers ?? {}),
  };
}

function buildAuthHeaders(token?: string, headers?: AxiosRequestConfig['headers']) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...resolveClinicaRequestHeaders(token),
    ...(headers ?? {}),
  };
}

function notifyAuthExpired(token?: string, code?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { token, code } }));
  }
}

function toApiError(error: unknown, notifyUnauthorized = false, token?: string) {
  if (axios.isAxiosError(error) && error.response?.status === 429) {
    return new ApiError('Muitas tentativas. Aguarde antes de tentar novamente.', 429, 'rate_limited',
      readRetryAfter(axios.AxiosHeaders.from(error.response.headers as Parameters<typeof axios.AxiosHeaders.from>[0]).get('Retry-After'), error.response.data));
  }
  const mapped = mapApiError(error, notifyUnauthorized, token);
  return axios.isAxiosError(error)
    ? new ApiError(mapped.message, error.response?.status, readSensitiveIdentityError(error.response?.data)?.code ?? readPasswordPolicyError(error.response?.data)?.code ?? readSessionFailureCode(error.response?.data)
      ?? (isDatabaseUnavailable(error) ? DATABASE_UNAVAILABLE_CODE : error.code))
    : mapped;
}

function mapApiError(error: unknown, notifyUnauthorized = false, token?: string) {
  if (axios.isAxiosError(error)) {
    const identityError = readSensitiveIdentityError(error.response?.data);
    // A refusal for this action is not a session failure. Real HTTP 401s keep
    // the existing session handling below.
    if (identityError && error.response?.status !== 401) return new Error(identityError.message);
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new Error('A conexão demorou demais. Tente novamente.');
    }
    const policyError = readPasswordPolicyError(error.response?.data);
    if (policyError && (error.response?.status === 400 || error.response?.status === 503)) {
      return new Error(policyError.message);
    }
    if (isDatabaseUnavailable(error)) {
      return new Error(DATABASE_UNAVAILABLE_ERROR_MESSAGE);
    }
    // Axios does not expose a response when the API is offline, unreachable or
    // the browser blocks the response at the network layer (for example, CORS).
    if (!error.response || SERVICE_UNAVAILABLE_STATUS_CODES.has(error.response.status)) {
      return new Error(new Date().getHours() < 7
        ? MAINTENANCE_ERROR_MESSAGE
        : SERVICE_UNAVAILABLE_ERROR_MESSAGE);
    }

    if (error.response?.status === 401) {
      if (notifyUnauthorized) {
        notifyAuthExpired(token, readSessionFailureCode(error.response.data));
      }

      return new Error(readSessionFailureCode(error.response.data) === SESSION_ABSOLUTE_EXPIRED_CODE
        ? SESSION_ABSOLUTE_EXPIRED_MESSAGE : UNAUTHORIZED_ERROR_MESSAGE);
    }

    if (error.response?.status === 403) {
      return new Error(FORBIDDEN_ERROR_MESSAGE);
    }

    if (error.response.status >= 500) {
      return new Error(DEFAULT_ERROR_MESSAGE);
    }

    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return new Error(data);
    }

    if (typeof data === 'object' && data !== null) {
      const message = 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'error' in data && typeof data.error === 'string'
          ? data.error
          : null;

      if (message?.trim()) {
        return new Error(message);
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  return new Error(DEFAULT_ERROR_MESSAGE);
}

function isDatabaseUnavailable(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 503) return false;
  const data: unknown = error.response.data;
  return typeof data === 'object' && data !== null && 'code' in data && data.code === DATABASE_UNAVAILABLE_CODE;
}

function waitForRetry(ms: number, signal?: AxiosRequestConfig['signal']) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new axios.CanceledError()); };
    const timer = setTimeout(() => { signal?.removeEventListener?.('abort', cancel); resolve(); }, ms);
    if (signal?.aborted) cancel();
    else signal?.addEventListener?.('abort', cancel);
  });
}

// Leituras aguardam a retomada do banco (Retry-After) dentro de um orçamento fixo; escritas nunca repetem.
async function requestWithDatabaseRetry<T>(client: AxiosInstance, config: AxiosRequestConfig, beforeRetry: () => void, deadline: number) {
  const retryable = RETRYABLE_METHODS.has((config.method ?? 'GET').toUpperCase());
  for (;;) {
    try {
      return await client.request<T>(config);
    } catch (error) {
      if (!retryable || !isDatabaseUnavailable(error) || !axios.isAxiosError(error)) throw error;
      const retryAfter = readRetryAfter(
        axios.AxiosHeaders.from(error.response?.headers as Parameters<typeof axios.AxiosHeaders.from>[0]).get('Retry-After'),
        error.response?.data) ?? DATABASE_RETRY_DEFAULT_SECONDS;
      const waitMs = Math.min(Math.max(retryAfter, 1), DATABASE_RETRY_MAX_SECONDS) * 1000;
      if (Date.now() + waitMs > deadline) throw error;
      await waitForRetry(waitMs, config.signal);
      // Logout ou troca de clínica durante a espera: não reenviar com o contexto antigo.
      beforeRetry();
    }
  }
}

async function executeRequest<T>(client: AxiosInstance, config: AxiosRequestConfig, notifyUnauthorized = false, manageSession = true): Promise<T> {
  const headers = axios.AxiosHeaders.from(config.headers as Parameters<typeof axios.AxiosHeaders.from>[0]);
  const authorization = headers.get('Authorization');
  const originalToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7) : null;
  const epoch = sessionEpoch();
  const assertCurrentContext = () => {
    if (originalToken && epoch !== sessionEpoch()) throw new ApiError('A sessão foi alterada.', 409);
  };
  // Um orçamento por chamada, compartilhado com a repetição após refresh de token.
  const retryDeadline = Date.now() + DATABASE_RETRY_BUDGET_MS;
  const resolver = manageSession && client === apiClient && originalToken ? sessionTokenResolver : null;
  if (resolver && originalToken) {
    headers.set('Authorization', `Bearer ${await resolver(originalToken, false)}`);
    config = { ...config, headers };
  }
  assertCurrentContext();
  try {
    const response = await requestWithDatabaseRetry<T>(client, config, assertCurrentContext, retryDeadline);
    assertCurrentContext();

    if (response.status === 204) {
      return undefined as T;
    }

    return response.data;
  } catch (error) {
    assertCurrentContext();
    const sentToken = String(headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    if (resolver && originalToken && isJwtExpired(sentToken) && axios.isAxiosError(error) && error.response?.status === 401
      && readSessionFailureCode(error.response.data) !== SESSION_ABSOLUTE_EXPIRED_CODE) {
      const token = await resolver(originalToken, true);
      assertCurrentContext();
      // A generic 401 does not prove a write had no effect. A header alone also
      // cannot guarantee that the target endpoint implements idempotency.
      if (!['GET', 'HEAD', 'OPTIONS'].includes((config.method ?? 'GET').toUpperCase()))
        throw new ApiError('Sua sessão foi renovada. Confira se a alteração foi aplicada antes de tentar novamente.',
          409, 'session_write_retry_required');
      headers.set('Authorization', `Bearer ${token}`);
      try {
        const response = await requestWithDatabaseRetry<T>(client, { ...config, headers }, assertCurrentContext, retryDeadline);
        assertCurrentContext();
        return response.data;
      } catch (retryError) {
        assertCurrentContext();
        throw toApiError(retryError, notifyUnauthorized, token);
      }
    }
    throw toApiError(error, notifyUnauthorized, sentToken || undefined);
  }
}

export function get<T>(path: string, token?: string, config: RequestConfig & { manageSession?: boolean } = {}) {
  const { manageSession = true, ...requestConfig } = config;
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'GET',
    timeout: API_READ_TIMEOUT_MS,
    ...requestConfig,
    headers: buildJsonHeaders(token, config.headers),
  }, Boolean(token) && manageSession, manageSession);
}

export function getBlob(path: string, token?: string, config: RequestConfig = {}) {
  return executeRequest<Blob>(apiClient, {
    url: path,
    method: 'GET',
    responseType: 'blob',
    ...config,
    headers: buildAuthHeaders(token, config.headers),
  });
}

export function getExternal<T>(url: string, config: RequestConfig = {}) {
  return executeRequest<T>(publicApiClient, {
    url,
    method: 'GET',
    ...config,
    headers: buildJsonHeaders(undefined, config.headers),
  });
}

export function post<T>(path: string, data?: unknown, token?: string, config: RequestConfig = {}) {
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'POST',
    data,
    ...config,
    headers: buildJsonHeaders(token, config.headers),
  }, Boolean(token));
}

export function put<T>(path: string, data?: unknown, token?: string, config: RequestConfig = {}) {
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'PUT',
    data,
    ...config,
    headers: buildJsonHeaders(token, config.headers),
  }, Boolean(token));
}

export function del<T>(path: string, token?: string, config: RequestConfig = {}) {
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'DELETE',
    ...config,
    headers: buildJsonHeaders(token, config.headers),
  }, Boolean(token));
}

export function upload<T>(path: string, body: FormData, token: string, config: RequestConfig = {}) {
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'POST',
    data: body,
    ...config,
    headers: buildAuthHeaders(token, config.headers),
  }, Boolean(token));
}
