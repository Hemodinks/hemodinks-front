let queue: Promise<unknown> = Promise.resolve();
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks)
    return navigator.locks.request('hemodinks-session-refresh', action);
  const result = queue.then(action, action);
  queue = result.catch(() => undefined);
  return result;
}
