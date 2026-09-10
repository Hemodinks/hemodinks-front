import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api';
import { bootstrapErrorMessage, useBootstrapRequest } from './useBootstrapRequest';

afterEach(() => vi.useRealTimers());
describe('bootstrap request', () => {
  it('reports the real pending read, slow state and timeout without polling', async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => new Promise<string>(() => {}));
    const { result } = renderHook(() => useBootstrapRequest(true, request, 'public_clinics'));
    expect(result.current.loading).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(12_000));
    expect(result.current.slow).toBe(true);
    expect(result.current.canRetry).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(23_000));
    expect(result.current.canRetry).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(25_000));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain('demorou demais');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('cancels a slow attempt, blocks double retry and ignores its late response', async () => {
    vi.useFakeTimers();
    const resolves: ((value: string) => void)[] = [];
    const signals: AbortSignal[] = [];
    const request = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(resolve => resolves.push(resolve));
    });
    const { result } = renderHook(() => useBootstrapRequest(true, request, 'public_clinics'));
    await act(async () => { void result.current.retry(); });
    expect(request).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(35_000));
    await act(async () => { void result.current.retry(); void result.current.retry(); });
    expect(signals[0].aborted).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    await act(async () => resolves[1]('current'));
    await act(async () => resolves[0]('obsolete'));
    expect(result.current.data).toBe('current');
    expect(result.current.loading).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('discards previous session results and aborts on unmount', async () => {
    let resolveOld!: (value: string) => void;
    let signal!: AbortSignal;
    const first = (s: AbortSignal) => { signal = s; return new Promise<string>(r => { resolveOld = r; }); };
    const second = vi.fn(async () => 'clinic B');
    const { result, rerender, unmount } = renderHook(({ request }) => useBootstrapRequest(true, request, 'session_clinic_legal'), { initialProps: { request: first } });
    rerender({ request: second });
    await act(async () => {});
    expect(signal.aborted).toBe(true);
    await act(async () => resolveOld('clinic A'));
    expect(result.current.data).toBe('clinic B');
    unmount();
  });

  it('does not run a disabled request and permits manual recovery from failure', async () => {
    const request = vi.fn().mockRejectedValueOnce(new ApiError('internal stack', 503)).mockResolvedValue('ready');
    const { result, rerender } = renderHook(({ enabled }) => useBootstrapRequest(enabled, request, 'public_clinics'), { initialProps: { enabled: false } });
    expect(request).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await act(async () => {});
    expect(result.current.error).toContain('indisponível');
    await act(() => result.current.retry());
    expect(result.current.data).toBe('ready');
  });

  it.each([401, 403, 400, 500, 503])('sanitizes error %s without swallowing auth status', status => {
    const message = bootstrapErrorMessage(new ApiError('stack token clinic-id password', status));
    expect(message).not.toMatch(/stack|token|clinic-id|password/);
    if (status === 401) expect(message).toContain('expirada');
    if (status === 403) expect(message).toContain('não permitida');
  });
});
