import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncOperation } from './useAsyncOperation';

describe('useAsyncOperation', () => {
  it('padroniza sucesso, erro e retentativa', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Falha temporária'))
      .mockResolvedValueOnce('ok');
    const { result } = renderHook(() =>
      useAsyncOperation(async (_signal, value: string) => operation(value)),
    );

    await act(async () => {
      await expect(result.current.execute('teste')).rejects.toThrow('Falha temporária');
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      await expect(result.current.retry()).resolves.toBe('ok');
    });
    expect(result.current).toMatchObject({
      status: 'success',
      data: 'ok',
      error: null,
    });
  });

  it('cancela a operação ativa sem publicar resultado tardio', async () => {
    let resolveOperation: ((value: string) => void) | undefined;
    const { result } = renderHook(() =>
      useAsyncOperation(
        () =>
          new Promise<string>((resolve) => {
            resolveOperation = resolve;
          }),
      ),
    );

    let request: Promise<string>;
    act(() => {
      request = result.current.execute();
    });
    act(() => result.current.cancel());
    expect(result.current.status).toBe('cancelled');

    await act(async () => {
      resolveOperation?.('resultado tardio');
      await request;
    });
    expect(result.current.status).toBe('cancelled');
    expect(result.current.data).toBeNull();
  });
});
