export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1_000;
export const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1_000;

export function isSessionIdle(lastActivityAt: number, now = Date.now()) {
  return now - lastActivityAt >= SESSION_IDLE_TIMEOUT_MS;
}

export function shouldRefreshSession(
  lastActivityAt: number,
  lastRefreshAt: number,
  now = Date.now(),
) {
  return lastActivityAt > lastRefreshAt
    && now - lastRefreshAt >= SESSION_REFRESH_INTERVAL_MS;
}
