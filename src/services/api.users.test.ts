import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authenticate,
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

  it('monta os payloads de CRUD e troca de senha', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(axiosResponse({ id: 1 }))
      .mockResolvedValueOnce(axiosResponse({ id: 1 }))
      .mockResolvedValueOnce(
        axiosResponse({
          id: 1,
          precisaTrocarSenha: false,
          message: 'Senha alterada com sucesso',
        }),
      )
      .mockResolvedValueOnce(
        axiosResponse({
          id: 1,
          precisaTrocarSenha: true,
          message: 'Senha resetada para a senha padrao',
        }),
      )
      .mockResolvedValueOnce(axiosResponse(undefined, 204));

    const payload = {
      nome: 'Ana Hemodinks',
      email: 'ana@hemodinks.com',
      telefone: '+5581999999999',
      cpf: '52998224725',
      crm: '12345',
      crmUf: 'PE',
      fotoPerfil: null,
      dataNascimento: '1990-01-01',
      ativo: true,
      perfilId: 2,
    };

    await createUser(payload, 'jwt-token');
    await updateUser(1, payload, 'jwt-token');
    await changePassword(1, { senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@123' }, 'jwt-token');
    await resetPassword('ana@hemodinks.com');
    await expect(deleteUser(1, 'jwt-token')).resolves.toBeUndefined();

    expect(requestSpy).toHaveBeenNthCalledWith(1, {
      url: '/api/users/',
      method: 'POST',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, {
      url: '/api/users/1',
      method: 'PUT',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(3, {
      url: '/api/users/1/password',
      method: 'PUT',
      data: { senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@123' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(4, {
      url: '/api/users/password/reset',
      method: 'POST',
      data: { email: 'ana@hemodinks.com' },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(5, {
      url: '/api/users/1',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('monta as chamadas de documentos do cadastro medico', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(axiosResponse({ id: 2, arquivos: [] }))
      .mockResolvedValueOnce(axiosResponse({ id: 7, nomeOriginal: 'crm.pdf' }))
      .mockResolvedValueOnce(axiosResponse(undefined, 204));

    await getUser(2, 'jwt-token');
    await uploadUserArquivo(
      2,
      new File(['crm'], 'crm.pdf', { type: 'application/pdf' }),
      'jwt-token',
    );
    await expect(deleteUserArquivo(2, 7, 'jwt-token')).resolves.toBeUndefined();

    expect(requestSpy).toHaveBeenNthCalledWith(1, {
      url: '/api/users/2',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: '/api/users/2/arquivos',
        method: 'POST',
        data: expect.any(FormData),
        headers: {
          Authorization: 'Bearer jwt-token',
        },
      }),
    );
    expect(requestSpy).toHaveBeenNthCalledWith(3, {
      url: '/api/users/2/arquivos/7',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });
});
