import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { resolveClinicaRequestHeaders } from './clinicaContext';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const DEFAULT_ERROR_MESSAGE = 'Nao foi possivel concluir a operacao.';
const UNAUTHORIZED_ERROR_MESSAGE = 'Credenciais invalidas ou sessao expirada.';
export const AUTH_EXPIRED_EVENT = 'hemodinks:auth-expired';

type RequestConfig = Omit<AxiosRequestConfig, 'data' | 'method' | 'url'>;

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

function notifyAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

function toApiError(error: unknown, notifyUnauthorized = false) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      if (notifyUnauthorized) {
        notifyAuthExpired();
      }

      return new Error(UNAUTHORIZED_ERROR_MESSAGE);
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
  try {
    const response = await client.request<T>(config);

    if (response.status === 204) {
      return undefined as T;
    }

    return response.data;
  } catch (error) {
    throw toApiError(error, notifyUnauthorized);
  }
}

export function get<T>(path: string, token?: string, config: RequestConfig = {}) {
  return executeRequest<T>(apiClient, {
    url: path,
    method: 'GET',
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
  }, Boolean(token));
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
