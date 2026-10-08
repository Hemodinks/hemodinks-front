import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, ApiError, AUTH_EXPIRED_EVENT, put } from './api';
import { confirmEmailChange, requestEmailChange } from './sensitiveIdentityService';
const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
afterEach(() => vi.restoreAllMocks());
it.each([{}, { requestId: 'invalid', expiresAt: '2026-10-07' }, { requestId: '12345678-1234-1234-1234-123456789012', expiresAt: 'invalid' }])('não usa resposta de início inválida: %j', async data => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(response(data));
  await expect(requestEmailChange('password', 'new@example.com', 'token')).rejects.toThrow('não foi alterado');
});
it.each([{}, { code: 'pending' }])('não sinaliza sucesso sem identity_changed: %j', async data => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(response(data));
  await expect(confirmEmailChange('request', 'code', 'token')).rejects.toThrow('Não foi possível confirmar');
});
it('erro de cadastro mantém código e usa mensagem segura, sem comparar texto', async () => {
  vi.spyOn(apiClient, 'request').mockRejectedValue(new AxiosError('failed', undefined, undefined, undefined, response({ code: 'email_confirmation_required', message: 'private' }, 409)));
  await expect(put('/api/users/1', {}, 'token')).rejects.toEqual(expect.objectContaining({ code: 'email_confirmation_required', message: expect.stringContaining('confirme o novo endereço') }));
});
it('texto de mensagem não se torna código de revalidação', async () => {
  vi.spyOn(apiClient, 'request').mockRejectedValue(new AxiosError('failed', undefined, undefined, undefined, response({ message: 'identity_revalidation_failed' }, 403)));
  await expect(put('/api/users/1/password', {}, 'token')).rejects.toEqual(new ApiError('Operação não permitida.', 403));
});
it('401 real continua invalidando sessão mesmo com código de ação', async () => {
  vi.spyOn(apiClient, 'request').mockRejectedValue(new AxiosError('failed', undefined, undefined, undefined, response({ code: 'identity_revalidation_failed' }, 401)));
  const expired = vi.fn(); window.addEventListener(AUTH_EXPIRED_EVENT, expired);
  await expect(requestEmailChange('password', 'new@example.com', 'token')).rejects.toThrow();
  expect(expired).toHaveBeenCalledOnce(); window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
});
