let queue: Promise<unknown> = Promise.resolve();
export async function withSessionLock<T>(action: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  if (typeof navigator !== 'undefined' && navigator.locks)
    return navigator.locks.request('hemodinks-session-refresh', { signal }, action);
  const perform = () => { signal?.throwIfAborted(); return action(); };
  const result = queue.then(perform, perform);
  queue = result.catch(() => undefined);
  if (!signal) return result;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    result.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
