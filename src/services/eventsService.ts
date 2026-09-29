import type {
  AgendaEvent,
  AgendaEventPayload,
  AgendaMedicalUser,
  AgendaNotificationRecipientOptions,
} from '../types';
import { del, get, post, put } from './api';

export type AgendaEventFilters = { search?: string; userId?: number; isCompleted?: boolean };

export function getAgendaEvents(token: string, from?: string, to?: string, filters?: AgendaEventFilters) {
  const params = new URLSearchParams();

  if (from) {
    params.set('from', from);
    if (to) params.set('fromDate', civilDate(from));
  }

  if (to) {
    params.set('to', to);
    if (from) params.set('toDate', civilDate(to));
  }

  if (filters?.search) params.set('search', filters.search);
  if (filters?.userId !== undefined) params.set('userId', String(filters.userId));
  if (filters?.isCompleted !== undefined) params.set('isCompleted', String(filters.isCompleted));

  return get<AgendaEvent[]>('/api/events/', token, {
    params: params.toString() ? params : undefined,
  });
}

export function createAgendaEvent(payload: AgendaEventPayload, token: string) {
  return post<AgendaEvent>('/api/events/', payload, token);
}

export function updateAgendaEvent(id: number, payload: AgendaEventPayload, token: string) {
  return put<AgendaEvent>(`/api/events/${id}`, payload, token);
}

export function completeAgendaEvent(id: number, token: string) {
  return post<void>(`/api/events/${id}/complete`, undefined, token);
}

export function deleteAgendaEvent(id: number, token: string) {
  return del<void>(`/api/events/${id}`, token);
}

export function getAgendaMedicalUsers(token: string) {
  return get<AgendaMedicalUser[]>('/api/events/medical-users', token);
}

export function getAgendaNotificationRecipientOptions(token: string, query?: { search: string; profile: string; page: number }) {
  const params = query ? new URLSearchParams({ search: query.search, profile: query.profile, page: String(query.page), pageSize: '20' }) : undefined;
  return get<AgendaNotificationRecipientOptions>('/api/events/notification-recipients', token, { params });
}

export function markAgendaNotificationsAsRead(token: string) {
  return post<{ updatedCount: number }>('/api/events/notifications/mark-read', undefined, token);
}

function civilDate(value: string) {
  const date = new Date(value);
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
