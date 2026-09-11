import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { listPublicClinics } from '../../services';
import { ApiError } from '../../services/api';
import { useLoginPreparation } from './useLoginPreparation';

vi.mock('../../services', () => ({ listPublicClinics: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

it('waits for public metadata and reuses it in memory when login remounts', async () => {
  vi.mocked(listPublicClinics).mockResolvedValue([{ id: 1, nome: 'Clinic', slug: 'clinic' }]);
  const { client, wrapper } = setup();
  const first = renderHook(useLoginPreparation, { wrapper });
  expect(first.result.current.ready).toBe(false);
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  expect(listPublicClinics).toHaveBeenCalledWith('', expect.any(AbortSignal));
  first.unmount();
  const second = renderHook(useLoginPreparation, { wrapper });
  expect(second.result.current.ready).toBe(true);
  expect(listPublicClinics).toHaveBeenCalledOnce();
  second.unmount();
  client.clear();
});

it('does not release the form on failure or an empty directory and supports retry', async () => {
  vi.mocked(listPublicClinics).mockRejectedValueOnce(new ApiError('denied', 403)).mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: 1, nome: 'Clinic', slug: 'clinic' }]);
  const { client, wrapper } = setup();
  const { result, unmount } = renderHook(useLoginPreparation, { wrapper });
  await waitFor(() => expect(result.current.waiting).toBe(false));
  expect(result.current.ready).toBe(false);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.empty).toBe(true));
  expect(result.current.ready).toBe(false);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.ready).toBe(true));
  unmount();
  client.clear();
});

it('aborts preparation when leaving the page', async () => {
  vi.mocked(listPublicClinics).mockImplementation(() => new Promise(() => {}));
  const { client, wrapper } = setup();
  const { unmount } = renderHook(useLoginPreparation, { wrapper });
  const signal = vi.mocked(listPublicClinics).mock.calls[0][1]!;
  unmount();
  expect(signal.aborted).toBe(true);
  client.clear();
});

it('limits automatic retries and stops waiting when the service stays unavailable', async () => {
  vi.useFakeTimers();
  vi.mocked(listPublicClinics).mockRejectedValue(new ApiError('unavailable', 503));
  const { client, wrapper } = setup();
  const { result, unmount } = renderHook(useLoginPreparation, { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(36_000); });
  expect(listPublicClinics).toHaveBeenCalledTimes(5);
  expect(result.current.waiting).toBe(false);
  expect(result.current.ready).toBe(false);
  unmount();
  client.clear();
});
