import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UPDATE_CHECK_INTERVAL_MS, useAppUpdate } from './useAppUpdate';

const html = (id: string) => '<meta name="hemodinks-build-id" content="' + id + '">';
const reply = (body: string, ok = true) => ({ ok, text: async () => body });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('detects a different build without sending credentials or using cached HTML', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply(html('new')));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useAppUpdate(true, 'old'));
  await waitFor(() => expect(result.current).toBe(true));
  expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/^\/index.html\?app-version-check=/), {
    cache: 'no-store', credentials: 'omit', signal: expect.any(AbortSignal),
  });
  window.dispatchEvent(new Event('focus'));
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it.each([html('same'), '<html>legacy deployment</html>'])('does not warn for the same or missing build', async body => {
  const fetcher = vi.fn().mockResolvedValue(reply(body));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useAppUpdate(true, 'same'));
  await act(async () => {});
  expect(fetcher).toHaveBeenCalledOnce();
  expect(result.current).toBe(false);
});

it('retries after a network failure and throttles resume events', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(reply(html('new')));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useAppUpdate(true, 'old'));
  await act(async () => {});
  window.dispatchEvent(new Event('focus'));
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS); });
  expect(result.current).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('ignores server errors and disables checks in development', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply(html('new'), false));
  vi.stubGlobal('fetch', fetcher);
  const { result, unmount } = renderHook(() => useAppUpdate(true, 'old'));
  await act(async () => {});
  expect(result.current).toBe(false);
  unmount();
  renderHook(() => useAppUpdate(false, 'old'));
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('aborts pending checks and removes timers on unmount', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal('fetch', fetcher);
  const { unmount } = renderHook(() => useAppUpdate(true, 'old'));
  const signal = fetcher.mock.calls[0][1].signal as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
  window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
