import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, AUTH_EXPIRED_EVENT, registerSessionTokenResolver } from './api';
import { getSecurityObservations } from './monitoringService';

const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
afterEach(() => vi.restoreAllMocks());

it('consome somente a paginação real e descarta campos que não serão apresentados', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue(response({ items: [{
    timestamp: '2026-10-07T19:00:00Z', kind: 'AuthenticationSucceeded', operation: 'login', reason: 'completed', clinicId: 1,
    requestId: 'private-request', accountKey: 'a'.repeat(64), email: 'sensitive@example.com', token: 'private-token',
  }], page: 1, pageSize: 25 }));
  const controller = new AbortController();
  const result = await getSecurityObservations('bearer', 1, controller.signal);
  expect(result).toEqual({ items: [{ timestamp: '2026-10-07T19:00:00.000Z', kind: 'AuthenticationSucceeded', operation: 'login', reason: 'completed', clinicId: 1 }], page: 1, pageSize: 25 });
  expect(request).toHaveBeenCalledOnce();
  const config = request.mock.calls[0][0];
  expect(config).toMatchObject({ url: '/api/monitoramento/seguranca', method: 'GET', signal: controller.signal });
  expect(config.params.toString()).toBe('page=1&pageSize=25');
});

it.each([401, 403, 500, 503])('falha %s não altera sessão nem revela a mensagem bruta', async status => {
  const resolver = vi.fn();
  const unregister = registerSessionTokenResolver(resolver);
  const expired = vi.fn();
  window.addEventListener(AUTH_EXPIRED_EVENT, expired);
  const token = 'h.' + btoa(JSON.stringify({ exp: 1 })) + '.s';
  const request = vi.spyOn(apiClient, 'request').mockRejectedValue(new AxiosError('private-password', undefined, undefined, undefined,
    response({ message: 'private-password private-token sensitive@example.com' }, status)));
  try {
    await expect(getSecurityObservations(token)).rejects.toThrow(status < 500 ? 'Você não tem acesso' : 'Não foi possível carregar');
    expect(expired).not.toHaveBeenCalled();
    expect(resolver).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledOnce();
  } finally { unregister(); window.removeEventListener(AUTH_EXPIRED_EVENT, expired); }
});

it.each([
  { items: null, page: 1, pageSize: 25 },
  { items: [], page: 2, pageSize: 25 },
  { items: [], page: 1, pageSize: 0 },
  { items: [{ timestamp: 'private-secret' }], page: 1, pageSize: 25 },
])('recusa contrato inválido sem exibir seu conteúdo', async data => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(response(data));
  await expect(getSecurityObservations('bearer')).rejects.toThrow('Não foi possível carregar os eventos de segurança. Tente novamente.');
});
