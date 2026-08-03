import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authenticate,
  configureAuthSessionRecovery,
  changePassword,
  createPaciente,
  createUser,
  deletePaciente,
  deletePacienteArquivo,
  downloadPacienteArquivo,
  deleteUser,
  deleteUserArquivo,
  downloadUserArquivo,
  getAllCbhpmGeral,
  getBrazilPublicHolidays,
  getConvenios,
  getCurrentLicenca,
  getDashboardNotifications,
  getHospitais,
  getOpmeFornecedores,
  getPacienteObservacoes,
  getSystemSettings,
  getSystemSettingsCompanyPhoto,
  getUser,
  getUserProfilePhoto,
  getPacientes,
  getUsers,
  resetPassword,
  refreshSession,
  updatePaciente,
  updateSystemSettings,
  updateUser,
  uploadPacienteArquivo,
  uploadUserArquivo,
} from './index';
import { AUTH_EXPIRED_EVENT, apiClient, publicApiClient } from './api';
import { extractClinicaContextFromToken, resolveClinicaSlugFromHostname } from './clinicaContext';

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    headers: {},
    config: { headers: {} } as AxiosResponse<T>['config'],
  };
}

function apiError(status: number, data?: unknown) {
  return new AxiosError(
    'Request failed',
    undefined,
    undefined,
    undefined,
    axiosResponse(data, status),
  );
}

describe('services api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  function createJwtToken(payload: Record<string, unknown>) {
    const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = btoa(JSON.stringify(payload));
    return `${encodedHeader}.${encodedPayload}.signature`;
  }

  it('autentica enviando email e senha para a rota correta', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse({
        id: 1,
        nome: 'George',
        email: 'gmarcone@gmail.com',
        token: 'jwt-token',
        precisaTrocarSenha: false,
        perfilId: 1,
        perfilNome: 'Administrador',
      }),
    );

    const result = await authenticate('gmarcone@gmail.com', 'Senha@123');

    expect(result.token).toBe('jwt-token');
    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/users/authenticate',
      method: 'POST',
      data: { email: 'gmarcone@gmail.com', senha: 'Senha@123' },
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('envia o slug da clinica em autenticacao publica quando configurado no front', async () => {
    vi.stubEnv('VITE_CLINICA_SLUG', 'clinica-alfa');
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse({
        id: 1,
        nome: 'George',
        email: 'gmarcone@gmail.com',
        token: 'jwt-token',
        precisaTrocarSenha: false,
        perfilId: 1,
        perfilNome: 'Administrador',
      }),
    );

    await authenticate('gmarcone@gmail.com', 'Senha@123');

    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/users/authenticate',
      method: 'POST',
      data: { email: 'gmarcone@gmail.com', senha: 'Senha@123' },
      headers: {
        'Content-Type': 'application/json',
        'X-Clinica-Slug': 'clinica-alfa',
      },
    });
  });

  it('inclui o token bearer ao buscar usuarios', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse([]));

    const token = createJwtToken({
      clinicaId: '7',
      clinicaSlug: 'clinica-beta',
    });

    await getUsers(token);

    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/users/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Clinica-Id': '7',
        'X-Clinica-Slug': 'clinica-beta',
      },
    });
  });

  it('busca a foto de perfil do usuario com token bearer', async () => {
    const requestSpy = vi
      .spyOn(apiClient, 'request')
      .mockResolvedValueOnce(axiosResponse(new Blob(['avatar'], { type: 'image/png' })));

    const result = await getUserProfilePhoto(1, 'jwt-token');

    expect(result.size).toBe(6);
    expect(result.type).toBe('image/png');
    await expect(result.text()).resolves.toBe('avatar');
    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/users/1/foto-perfil',
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('busca a foto da empresa sem exigir token bearer', async () => {
    vi.stubEnv('VITE_CLINICA_ID', '12');
    const requestSpy = vi
      .spyOn(apiClient, 'request')
      .mockResolvedValueOnce(axiosResponse(new Blob(['brand'], { type: 'image/png' })));

    const result = await getSystemSettingsCompanyPhoto();

    expect(result.size).toBe(5);
    expect(result.type).toBe('image/png');
    await expect(result.text()).resolves.toBe('brand');
    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/configuracoes-sistema/current/foto-empresa',
      method: 'GET',
      responseType: 'blob',
      headers: {
        'X-Clinica-Id': '12',
      },
    });
  });

  it('busca notificacoes do dashboard com token bearer', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse([]));

    await getDashboardNotifications('jwt-token');

    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/dashboard/notifications',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('consulta a licenca atual com token bearer', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse({
        userId: 99,
        featuresEfetivas: ['Pacientes.Visualizar'],
      }),
    );

    const result = await getCurrentLicenca('jwt-token');

    expect(result?.featuresEfetivas).toEqual(['Pacientes.Visualizar']);
    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/licencas/current',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('normaliza mensagens de erro da API', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(
      apiError(400, { message: 'Email ja cadastrado' }),
    );

    await expect(getUsers('jwt-token')).rejects.toThrow('Email ja cadastrado');
  });

  it('usa mensagem padrao para resposta 401', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(apiError(401));

    await expect(authenticate('email@teste.com', 'senha')).rejects.toThrow(
      'Credenciais invalidas ou sessao expirada.',
    );
  });

  it('renova por cookie e repete uma chamada autenticada que recebeu 401', async () => {
    const onTokenRefreshed = vi.fn();
    const removeRecovery = configureAuthSessionRecovery(onTokenRefreshed);
    const requestSpy = vi
      .spyOn(apiClient, 'request')
      .mockRejectedValueOnce(apiError(401))
      .mockResolvedValueOnce(
        axiosResponse({
          token: 'new-token',
          sessionIdleExpiresAt: '2026-08-03T12:30:00Z',
        }),
      )
      .mockResolvedValueOnce(axiosResponse([]));

    await expect(getUsers('old-token')).resolves.toEqual([]);

    expect(onTokenRefreshed).toHaveBeenCalledWith('new-token');
    expect(requestSpy).toHaveBeenNthCalledWith(2, {
      url: '/api/session/renovar',
      method: 'POST',
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(3, {
      url: '/api/users/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer new-token',
      },
    });

    removeRecovery();
  });

  it('renova a sessao usando somente o refresh cookie', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse({
        token: 'new-token',
        sessionIdleExpiresAt: '2026-08-03T12:30:00Z',
      }),
    );

    await expect(refreshSession()).resolves.toMatchObject({ token: 'new-token' });
    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/session/renovar',
      method: 'POST',
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('não exibe stack trace de desserialização para o usuário', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(
      apiError(
        400,
        'Microsoft.AspNetCore.Http.BadHttpRequestException: Failed to read parameter --- System.Text.Json.JsonException stack trace at Microsoft.AspNetCore',
      ),
    );

    await expect(getUsers('jwt-token')).rejects.toThrow(
      'Alguns campos estão ausentes ou possuem formato inválido',
    );
  });

  it('baixa documentos privados com token bearer', async () => {
    const patientBlob = new Blob(['laudo'], { type: 'application/pdf' });
    const userBlob = new Blob(['crm'], { type: 'application/pdf' });
    const requestSpy = vi
      .spyOn(apiClient, 'request')
      .mockResolvedValueOnce(axiosResponse(patientBlob))
      .mockResolvedValueOnce(axiosResponse(userBlob));

    await expect(downloadPacienteArquivo(10, 3, 'jwt-token')).resolves.toBe(patientBlob);
    await expect(downloadUserArquivo(2, 7, 'jwt-token')).resolves.toBe(userBlob);

    expect(requestSpy).toHaveBeenNthCalledWith(1, {
      url: '/api/pacientes/10/arquivos/3/download',
      method: 'GET',
      responseType: 'blob',
      headers: { Authorization: 'Bearer jwt-token' },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, {
      url: '/api/users/2/arquivos/7/download',
      method: 'GET',
      responseType: 'blob',
      headers: { Authorization: 'Bearer jwt-token' },
    });
  });

  it('notifica a aplicacao quando uma chamada autenticada retorna 401', async () => {
    const authExpiredHandler = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, authExpiredHandler);
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(apiError(401));

    await expect(getUsers('jwt-token')).rejects.toThrow(
      'Credenciais invalidas ou sessao expirada.',
    );

    expect(authExpiredHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, authExpiredHandler);
  });

  it('usa mensagem especifica ao falhar consulta de feriados nacionais', async () => {
    vi.spyOn(publicApiClient, 'request').mockRejectedValueOnce(apiError(503));

    await expect(getBrazilPublicHolidays(2026)).rejects.toThrow(
      'Nao foi possivel carregar feriados nacionais.',
    );
  });
});
