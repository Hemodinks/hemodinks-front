import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDelayedLoading } from './useDelayedLoading';

describe('useDelayedLoading', () => {
  afterEach(() => vi.useRealTimers());

  it('exibe o loading somente quando a consulta ultrapassa um segundo', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedLoading(active),
      { initialProps: { active: true } },
    );

    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
  });
});
