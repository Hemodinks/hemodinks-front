import { type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from './api';
import { completeMfaLogin } from './authService';
import { activateMfa, beginMfaSetup, deactivateMfa, getMfaStatus } from './mfaService';
import { isSessionHandoverActive } from './sessionHandover';

// #150: contratos de MFA da API.
const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
afterEach(() => vi.restoreAllMocks());

it('consulta status, inicia configuracao e desativa nas rotas da propria conta', async () => {
  const request = vi.spyOn(apiClient, 'request')
    .mockResolvedValueOnce(response({ elegivel: true, habilitado: false, codigosRecuperacaoRestantes: 0 }))
    .mockResolvedValueOnce(response({ segredo: 'ABC', otpAuthUri: 'otpauth://totp/x' }))
    .mockResolvedValueOnce(response(undefined, 204));
  await expect(getMfaStatus('token')).resolves.toEqual(expect.objectContaining({ elegivel: true }));
  await expect(beginMfaSetup('token')).resolves.toEqual({ segredo: 'ABC', otpAuthUri: 'otpauth://totp/x' });
  await deactivateMfa('senha', '123456', 'token');
  expect(request.mock.calls.map(([config]) => `${config.method} ${config.url}`)).toEqual([
    'GET /api/users/me/mfa', 'POST /api/users/me/mfa/configuracao', 'POST /api/users/me/mfa/desativacao']);
  expect(request.mock.calls[2][0].data).toEqual({ senha: 'senha', codigo: '123456' });
});

it('ativacao com sessao renovada mantem o handover ate o app restaurar a sessao', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue(response({ codigosRecuperacao: ['A-B'], sessionRenewed: true }));
  await expect(activateMfa('senha', '123456', 'token')).resolves.toEqual({ codigosRecuperacao: ['A-B'], sessionRenewed: true });
  const config = request.mock.calls[0][0];
  expect(config.url).toBe('/api/users/me/mfa/ativacao');
  expect(config.withCredentials).toBe(true);
  expect(config.data).toEqual({ senha: 'senha', codigo: '123456' });
  expect(isSessionHandoverActive()).toBe(true);
});

it.each([{}, { codigosRecuperacao: 'x' }])('rejeita resposta de ativacao invalida e encerra o handover: %j', async data => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(response(data));
  await expect(activateMfa('senha', '123456', 'token')).rejects.toThrow('ativação');
  expect(isSessionHandoverActive()).toBe(false);
});

it('ativacao sem renovacao encerra o handover', async () => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(response({ codigosRecuperacao: ['A-B'], sessionRenewed: false }));
  await expect(activateMfa('senha', '123456', 'token')).resolves.toEqual({ codigosRecuperacao: ['A-B'], sessionRenewed: false });
  expect(isSessionHandoverActive()).toBe(false);
});

it('conclui o login com desafio e codigo na clinica do login', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue(response({ id: 1, token: 'jwt' }));
  await completeMfaLogin('desafio', '123456', 'clinica-a');
  const config = request.mock.calls[0][0];
  expect(config.url).toBe('/api/users/authenticate/mfa');
  expect(config.data).toEqual({ desafio: 'desafio', codigo: '123456' });
  expect(config.withCredentials).toBe(true);
  expect(config.headers).toEqual(expect.objectContaining({ 'X-Clinica-Slug': 'clinica-a', 'X-Session-Refresh': '1' }));
});
