import { act, render, screen } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingOverlay } from '../shared/components/LoadingOverlay';
import { apiClient, get, post } from './api';
import {
  beginQueryActivity,
  getQueryActivitySnapshot,
  resetQueryActivityForTests,
  subscribeToQueryActivity,
} from './queryActivity';

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as AxiosResponse<T>['config'],
  };
}

describe('query activity', () => {
  beforeEach(() => {
    resetQueryActivityForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    resetQueryActivityForTests();
  });

  it('mantém o estado ativo enquanto houver consultas simultâneas', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToQueryActivity(listener);
    const finishFirst = beginQueryActivity();
    const finishSecond = beginQueryActivity();

    expect(getQueryActivitySnapshot()).toBe(true);
    finishFirst();
    expect(getQueryActivitySnapshot()).toBe(true);
    finishFirst();
    finishSecond();
    expect(getQueryActivitySnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it('rastreia GET e sempre encerra o loading após sucesso ou erro', async () => {
    let resolveRequest: ((response: AxiosResponse) => void) | undefined;
    vi.spyOn(apiClient, 'request').mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const request = get('/api/test');
    expect(getQueryActivitySnapshot()).toBe(true);
    resolveRequest?.(axiosResponse({ ok: true }));
    await expect(request).resolves.toEqual({ ok: true });
    expect(getQueryActivitySnapshot()).toBe(false);

    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new AxiosError('Falha'));
    const failedRequest = get('/api/test');
    expect(getQueryActivitySnapshot()).toBe(true);
    await expect(failedRequest).rejects.toThrow('Falha');
    expect(getQueryActivitySnapshot()).toBe(false);
  });

  it('não ativa o indicador global para mutações', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse({ id: 1 }));
    const request = post('/api/test', { nome: 'Teste' });

    expect(getQueryActivitySnapshot()).toBe(false);
    await expect(request).resolves.toEqual({ id: 1 });
  });

  it('evita piscar em consultas rápidas e mantém tempo mínimo quando exibido', () => {
    vi.useFakeTimers();
    render(<LoadingOverlay active={false} />);

    let finishQuery: (() => void) | undefined;
    act(() => {
      finishQuery = beginQueryActivity();
    });
    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(screen.queryByText('Buscando informações...')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText('Buscando informações...')).toBeInTheDocument();

    act(() => {
      finishQuery?.();
      vi.advanceTimersByTime(349);
    });
    expect(screen.getByText('Buscando informações...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Buscando informações...')).not.toBeInTheDocument();
  });
});
