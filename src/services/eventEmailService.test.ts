import { expect, it, vi } from 'vitest';
import { get, post } from './api';
import { getEventEmailNotification, queueEventEmailNotification } from './eventEmailService';

vi.mock('./api', () => ({ get: vi.fn(), post: vi.fn() }));

it('requests server-scoped recipients and supports aborting the preview', () => {
  const signal = new AbortController().signal;
  getEventEmailNotification(12, 'session-token', signal);
  expect(get).toHaveBeenCalledWith('/api/events/12/email-notification', 'session-token', { signal });
});

it('queues without recipient, email or clinic payload and retains the retry key', () => {
  queueEventEmailNotification(12, 'session-token', 'retry-key');
  expect(post).toHaveBeenCalledWith('/api/events/12/email-notification', { copyToCreator: false }, 'session-token', {
    headers: { 'Idempotency-Key': 'retry-key' }, timeout: 60_000,
  });
});


it('previews creator opt-in using only a boolean query parameter', () => {
  const signal = new AbortController().signal;
  getEventEmailNotification(12, 'session-token', signal, true);
  expect(get).toHaveBeenLastCalledWith('/api/events/12/email-notification?copyToCreator=true', 'session-token', { signal });
});

it('queues creator opt-in without trusting a client recipient or clinic', () => {
  queueEventEmailNotification(12, 'session-token', 'retry-key', true);
  expect(post).toHaveBeenLastCalledWith('/api/events/12/email-notification', { copyToCreator: true }, 'session-token', {
    headers: { 'Idempotency-Key': 'retry-key' }, timeout: 60_000,
  });
});
