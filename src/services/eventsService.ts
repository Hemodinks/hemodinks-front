import type {
  AgendaEvent,
  AgendaEventPayload,
  AgendaMedicalUser,
  AgendaNotificationRecipientOptions,
} from '../types';
import { del, get, post, put } from './api';

export function getAgendaEvents(token: string, from?: string, to?: string) {
  const params = new URLSearchParams();

  if (from) {
    params.set('from', from);
  }

  if (to) {
    params.set('to', to);
  }

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

export function getAgendaNotificationRecipientOptions(token: string) {
  return get<AgendaNotificationRecipientOptions>('/api/events/notification-recipients', token);
}

export function markAgendaNotificationsAsRead(token: string) {
  return post<{ updatedCount: number }>('/api/events/notifications/mark-read', undefined, token);
}
