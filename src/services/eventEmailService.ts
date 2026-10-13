import { get, post } from './api';
import type { EventEmailPreview, EventEmailQueueResult } from '../types/eventEmail';

export function getEventEmailNotification(eventId: number, token: string, signal?: AbortSignal, copyToCreator = false) {
  return get<EventEmailPreview>(
    '/api/events/' + eventId + '/email-notification' + (copyToCreator ? '?copyToCreator=true' : ''), token, { signal },
  );
}

export function queueEventEmailNotification(eventId: number, token: string, idempotencyKey: string, copyToCreator = false) {
  return post<EventEmailQueueResult>(
    '/api/events/' + eventId + '/email-notification', { copyToCreator }, token,
    { headers: { 'Idempotency-Key': idempotencyKey }, timeout: 60_000 },
  );
}
