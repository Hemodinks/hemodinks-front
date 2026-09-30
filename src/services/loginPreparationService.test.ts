import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); sessionStorage.clear(); vi.stubEnv('VITE_LOGIN_PREPARATION_ENABLED', 'true'); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function setup() {
  const { apiClient } = await import('./api');
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 204 });
  return { get, ...await import('./loginPreparationService') };
}
it('deduplicates concurrent calls and expires successful readiness', async () => {
  const { get, warmLoginApi } = await setup();
  await Promise.all([warmLoginApi(), warmLoginApi()]);
  expect(get).toHaveBeenCalledTimes(1);
  await warmLoginApi();
  expect(get).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 301_000);
  await warmLoginApi();
  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[0][1]).toMatchObject({ timeout: 60_000, withCredentials: false });
});
it('does not cache failure and allows a later attempt', async () => {
  const { get, warmLoginApi } = await setup();
  get.mockRejectedValueOnce(new Error('offline'));
  await expect(warmLoginApi()).rejects.toThrow();
  expect(sessionStorage.getItem('hemodinks-login-ready-at')).toBeNull();
  await warmLoginApi();
  expect(get).toHaveBeenCalledTimes(2);
});
it('retries only warmup and bounds failed attempts', async () => {
  const { get, prepareLoginApi } = await setup();
  get.mockRejectedValue(new Error('offline'));
  const result = expect(prepareLoginApi(new AbortController().signal)).rejects.toThrow('Nenhuma credencial');
  await vi.runAllTimersAsync();
  await result;
  expect(get).toHaveBeenCalledTimes(3);
});
it('cancel interrupts retry delay without a new request', async () => {
  const { get, prepareLoginApi } = await setup();
  get.mockRejectedValue(new Error('offline'));
  const controller = new AbortController();
  const result = expect(prepareLoginApi(controller.signal)).rejects.toThrow('Cancelled');
  await vi.advanceTimersByTimeAsync(1);
  controller.abort();
  await result;
  await vi.runAllTimersAsync();
  expect(get).toHaveBeenCalledTimes(1);
});
it('does not retry a definitive failure', async () => {
  const { get, prepareLoginApi } = await setup();
  get.mockRejectedValue({ response: { status: 403 } });
  await expect(prepareLoginApi(new AbortController().signal)).rejects.toThrow('Nenhuma credencial');
  expect(get).toHaveBeenCalledTimes(1);
});
it('can disable preparation for production', async () => {
  const { isLoginPreparationEnabled } = await setup();
  vi.stubEnv('VITE_LOGIN_PREPARATION_ENABLED', 'false');
  expect(isLoginPreparationEnabled()).toBe(false);
});
