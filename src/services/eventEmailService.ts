import { get, post } from './api';
import type { EventEmailPreview, EventEmailQueueResult } from '../types/eventEmail';

export function getEventEmailNotification(eventId: number, token: string, signal?: AbortSignal) {
  return get<EventEmailPreview>(
    '/api/events/' + eventId + '/email-notification', token, { signal },
  );
}

export function queueEventEmailNotification(eventId: number, token: string, idempotencyKey: string) {
  return post<EventEmailQueueResult>(
    '/api/events/' + eventId + '/email-notification', undefined, token,
    { headers: { 'Idempotency-Key': idempotencyKey }, timeout: 60_000 },
  );
}
