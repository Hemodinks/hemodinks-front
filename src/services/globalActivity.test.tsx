import { act, render, screen } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingOverlay } from '../shared/components/LoadingOverlay';
import { GlobalActivityProvider } from '../shared/activity/GlobalActivityProvider';
import { apiClient, get, post } from './api';
import {
  beginGlobalActivity,
  getGlobalActivitySnapshot,
  resetGlobalActivityForTests,
  subscribeToGlobalActivity,
  withGlobalActivity,
} from './globalActivity';

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as AxiosResponse<T>['config'],
  };
}

describe('global activity', () => {
  beforeEach(() => {
    resetGlobalActivityForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    act(() => resetGlobalActivityForTests());
  });

  it('mantém o estado ativo enquanto houver consultas simultâneas', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToGlobalActivity(listener);
    const finishFirst = beginGlobalActivity({ kind: 'query' });
    const finishSecond = beginGlobalActivity({ kind: 'query' });

    expect(getGlobalActivitySnapshot().foreground).not.toBeNull();
    finishFirst();
    expect(getGlobalActivitySnapshot().foreground).not.toBeNull();
    finishFirst();
    finishSecond();
    expect(getGlobalActivitySnapshot().foreground).toBeNull();
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it('rastreia GET e sempre encerra o loading após sucesso ou erro', async () => {
    let resolveRequest: ((response: AxiosResponse) => void) | undefined;
    vi.spyOn(apiClient, 'request').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const request = get('/api/test');
    expect(getGlobalActivitySnapshot().foreground).not.toBeNull();
    resolveRequest?.(axiosResponse({ ok: true }));
    await expect(request).resolves.toEqual({ ok: true });
    expect(getGlobalActivitySnapshot().foreground).toBeNull();

    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new AxiosError('Falha'));
    const failedRequest = get('/api/test');
    expect(getGlobalActivitySnapshot().foreground).not.toBeNull();
    await expect(failedRequest).rejects.toThrow('Falha');
    expect(getGlobalActivitySnapshot().foreground).toBeNull();
  });

  it('identifica mutações como gravações no indicador global', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse({ id: 1 }));
    const request = post('/api/test', { nome: 'Teste' });

    expect(getGlobalActivitySnapshot().foreground).toMatchObject({
      kind: 'save',
      eyebrow: 'Salvando',
      message: 'Gravando alterações...',
    });
    await expect(request).resolves.toEqual({ id: 1 });
    expect(getGlobalActivitySnapshot().foreground).toBeNull();
  });

  it('diferencia atualização em segundo plano e encerra operações longas', async () => {
    const finishBackground = beginGlobalActivity({
      kind: 'query',
      presentation: 'background',
    });
    expect(getGlobalActivitySnapshot()).toMatchObject({
      foreground: null,
      backgroundCount: 1,
    });
    finishBackground();

    await expect(
      withGlobalActivity({ kind: 'export' }, async () => {
        expect(getGlobalActivitySnapshot().foreground).toMatchObject({
          eyebrow: 'Exportando',
          message: 'Preparando arquivo...',
        });
        return 'arquivo';
      }),
    ).resolves.toBe('arquivo');
    expect(getGlobalActivitySnapshot().foreground).toBeNull();
  });

  it('evita piscar em consultas rápidas e mantém tempo mínimo quando exibido', () => {
    vi.useFakeTimers();
    render(
      <GlobalActivityProvider>
        <LoadingOverlay active={false} />
      </GlobalActivityProvider>,
    );

    let finishQuery: (() => void) | undefined;
    act(() => {
      finishQuery = beginGlobalActivity({ kind: 'query' });
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
