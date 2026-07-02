import type { ChangePasswordPayload, ListQuery, PagedResult, User, UserArquivo, UserPayload } from '../types';
import { del, get, getBlob, post, put, upload } from './api';
import { buildListQueryParams } from './queryParams';

export function getUsers(token: string, query?: ListQuery) {
  return get<PagedResult<User>>('/api/users/', token, {
    params: buildListQueryParams(query),
  });
}

export function getUser(id: number, token: string) {
  return get<User>(`/api/users/${id}`, token);
}

export function getUserProfilePhoto(id: number, token: string) {
  return getBlob(`/api/users/${id}/foto-perfil`, token);
}

export function createUser(payload: UserPayload, token: string) {
  return post<User>('/api/users/', payload, token);
}

export function updateUser(id: number, payload: UserPayload, token: string) {
  return put<User>(`/api/users/${id}`, payload, token);
}

export function deleteUser(id: number, token: string) {
  return del<void>(`/api/users/${id}`, token);
}

export function uploadUserArquivo(id: number, file: File, token: string) {
  const body = new FormData();
  body.append('file', file);
  return upload<UserArquivo>(`/api/users/${id}/arquivos`, body, token);
}

export function deleteUserArquivo(id: number, arquivoId: number, token: string) {
  return del<void>(`/api/users/${id}/arquivos/${arquivoId}`, token);
}

export function changePassword(id: number, payload: ChangePasswordPayload, token: string) {
  return put<{ id: number; precisaTrocarSenha: boolean; message: string }>(`/api/users/${id}/password`, payload, token);
}
