import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, post, put } from './api';
import { authenticate, resolveLoginClinics } from './authService';

const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
afterEach(() => vi.restoreAllMocks());
it.each(['/api/users/', '/api/pacientes/', '/api/users/7/password/reset', '/api/platform/clinicas'])('preserva contrato em %s, inclusive geração no servidor', async (path) => {
  const request = vi.spyOn(apiClient, 'request');
  for (const [code, status] of [['password_compromised', 400], ['password_policy_unavailable', 503]] as const) {
    request.mockRejectedValueOnce(new AxiosError('Failed', undefined, undefined, undefined, response({ code }, status)));
    await expect((path.endsWith('/password/reset') ? put : post)(path, {}, 'token')).rejects.toMatchObject({ code, status, message: expect.stringMatching(code === 'password_compromised' ? /Escolha outra senha/ : /Não foi possível verificar/) });
  }
});
it('login normal faz somente resolução de clínica e autenticação, sem normalizar credencial', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue(response({ clinicas: [], token: 'access' }));
  const senha = '  frase de acesso  ';
  await resolveLoginClinics('a@example.com', senha);
  await authenticate('a@example.com', senha);
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(['/api/users/login-context', '/api/users/authenticate']);
  for (const [config] of request.mock.calls) expect(config.data).toEqual({ email: 'a@example.com', senha });
});
