import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { resolveClinicaRequestHeaders } from './clinicaContext';
import { isJwtExpired } from '../shared/utils/jwt';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const DEFAULT_ERROR_MESSAGE = 'Nao foi possivel concluir a operacao.';
const SERVICE_UNAVAILABLE_ERROR_MESSAGE = 'Sistema temporariamente indisponível. Tente novamente mais tarde.';
const MAINTENANCE_ERROR_MESSAGE = 'Sistema temporariamente indisponível das 00:00 às 06:59 para manutenção dos dados.';
const SERVICE_UNAVAILABLE_STATUS_CODES = new Set([502, 503, 504]);
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
  constructor(message: string, readonly status?: number, readonly code?: string) {
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

function notifyAuthExpired(token?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { token } }));
  }
}

function toApiError(error: unknown, notifyUnauthorized = false, token?: string) {
  const mapped = mapApiError(error, notifyUnauthorized, token);
  return axios.isAxiosError(error)
    ? new ApiError(mapped.message, error.response?.status, error.code)
    : mapped;
}

function mapApiError(error: unknown, notifyUnauthorized = false, token?: string) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new Error('A conexão demorou demais. Tente novamente.');
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
        notifyAuthExpired(token);
      }

      return new Error(UNAUTHORIZED_ERROR_MESSAGE);
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

async function executeRequest<T>(client: AxiosInstance, config: AxiosRequestConfig, notifyUnauthorized = false): Promise<T> {
  const headers = axios.AxiosHeaders.from(config.headers as Parameters<typeof axios.AxiosHeaders.from>[0]);
  const authorization = headers.get('Authorization');
  const originalToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7) : null;
  const resolver = client === apiClient && originalToken ? sessionTokenResolver : null;
  if (resolver && originalToken) {
    headers.set('Authorization', `Bearer ${await resolver(originalToken, false)}`);
    config = { ...config, headers };
  }
  try {
    const response = await client.request<T>(config);

    if (response.status === 204) {
      return undefined as T;
    }

    return response.data;
  } catch (error) {
    const sentToken = String(headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    if (resolver && originalToken && isJwtExpired(sentToken) && axios.isAxiosError(error) && error.response?.status === 401) {
      const token = await resolver(originalToken, true);
      headers.set('Authorization', `Bearer ${token}`);
      try {
        return (await client.request<T>({ ...config, headers })).data;
      } catch (retryError) {
        throw toApiError(retryError, notifyUnauthorized, token);
      }
    }
    throw toApiError(error, notifyUnauthorized, sentToken || undefined);
  }
}

export function get<T>(path: string, token?: string, config: RequestConfig = {}) {
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'GET',
    timeout: API_READ_TIMEOUT_MS,
    ...config,
    headers: buildJsonHeaders(token, config.headers),
  }, Boolean(token));
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
