import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  vi.stubEnv('VITE_WARMUP_ENABLED', 'true');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

async function setup() {
  const { apiClient } = await import('./api');
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 204 });
  const { warmupApi } = await import('./warmupService');
  return { get, warmupApi };
}

describe('infrastructure warmup', () => {
  it('calls only the dedicated endpoint without auth or clinic configuration', async () => {
    const { get, warmupApi } = await setup();
    const expired = vi.fn();
    window.addEventListener('hemodinks:auth-expired', expired);
    try {
      await warmupApi();
      expect(get).toHaveBeenCalledExactlyOnceWith('/api/warmup', { timeout: 90_000, withCredentials: false });
      expect(expired).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('hemodinks-warmed')).toBe('1');
    } finally { window.removeEventListener('hemodinks:auth-expired', expired); }
  });

  it('deduplicates concurrent calls while HTTP is still pending', async () => {
    const { get, warmupApi } = await setup();
    let release!: (value: unknown) => void;
    get.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const pending = warmupApi();
    await warmupApi();
    expect(get).toHaveBeenCalledTimes(1);
    release({ status: 204 });
    await pending;
  });

  it('remembers an attempt across module reloads in the same tab', async () => {
    await (await setup()).warmupApi();
    vi.resetModules();
    const next = await setup();
    await next.warmupApi();
    expect(next.get).not.toHaveBeenCalled();
  });

  it.each([new Error('offline'), { response: { status: 401 } }, { code: 'ECONNABORTED' }])(
    'swallows failure and does not retry or dispatch an auth event', async failure => {
      const { get, warmupApi } = await setup();
      const dispatch = vi.spyOn(window, 'dispatchEvent');
      get.mockRejectedValue(failure);
      await expect(warmupApi()).resolves.toBeUndefined();
      await warmupApi();
      expect(get).toHaveBeenCalledTimes(1);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it('keeps an in-memory guard when storage is unavailable', async () => {
    const { get, warmupApi } = await setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await warmupApi();
    await warmupApi();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('can be disabled at build time without accessing the API', async () => {
    const { get, warmupApi } = await setup();
    vi.stubEnv('VITE_WARMUP_ENABLED', 'false');
    await warmupApi();
    expect(get).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('hemodinks-warmed')).toBeNull();
  });
});
