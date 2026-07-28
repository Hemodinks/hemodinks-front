import { describe, expect, it } from 'vitest';
import {
  isSessionIdle,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_REFRESH_INTERVAL_MS,
  shouldRefreshSession,
} from './sessionInactivity';

describe('sessionInactivity', () => {
  it('considera a sessao ociosa somente depois de 30 minutos', () => {
    expect(isSessionIdle(1_000, 1_000 + SESSION_IDLE_TIMEOUT_MS - 1)).toBe(false);
    expect(isSessionIdle(1_000, 1_000 + SESSION_IDLE_TIMEOUT_MS)).toBe(true);
  });

  it('renova quando houve atividade depois da ultima renovacao', () => {
    const lastRefreshAt = 1_000;
    const lastActivityAt = 2_000;

    expect(
      shouldRefreshSession(
        lastActivityAt,
        lastRefreshAt,
        lastRefreshAt + SESSION_REFRESH_INTERVAL_MS,
      ),
    ).toBe(true);
  });

  it('nao renova uma sessao sem nova atividade', () => {
    const timestamp = 1_000;

    expect(
      shouldRefreshSession(timestamp, timestamp, timestamp + SESSION_REFRESH_INTERVAL_MS),
    ).toBe(false);
  });
});
