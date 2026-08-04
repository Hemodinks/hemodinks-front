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

  it('consulta feriados nacionais pela API publica com axios', async () => {
    const requestSpy = vi.spyOn(publicApiClient, 'request').mockResolvedValueOnce(
      axiosResponse([
        {
          date: '2026-01-01',
          localName: 'Confraternizacao Universal',
          name: 'New Year',
          countryCode: 'BR',
          fixed: true,
          global: true,
          counties: null,
          launchYear: null,
          types: ['Public'],
        },
      ]),
    );

    const result = await getBrazilPublicHolidays(2026);

    expect(result).toHaveLength(1);
    expect(requestSpy).toHaveBeenCalledWith({
      url: 'https://date.nager.at/api/v3/PublicHolidays/2026/BR',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('monta as chamadas de configuracao do sistema', async () => {
    vi.stubEnv('VITE_CLINICA_SLUG', 'hemodinks');
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(
        axiosResponse({
          id: 1,
          nomeEmpresa: 'Hemodinks',
          fotoEmpresa: null,
          dataCadastro: '2026-06-22T00:00:00Z',
          dataAtualizacao: null,
        }),
      )
      .mockResolvedValueOnce(
        axiosResponse({
          id: 1,
          nomeEmpresa: 'Clinica Alfa',
          fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
          dataCadastro: '2026-06-22T00:00:00Z',
          dataAtualizacao: '2026-06-22T12:00:00Z',
        }),
      );

    await expect(getSystemSettings()).resolves.toMatchObject({
      nomeEmpresa: 'Hemodinks',
    });
    await expect(
      updateSystemSettings(
        {
          nomeEmpresa: 'Clinica Alfa',
          fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
        },
        'jwt-token',
      ),
    ).resolves.toMatchObject({ nomeEmpresa: 'Clinica Alfa' });

    expect(requestSpy).toHaveBeenNthCalledWith(1, {
      url: '/api/configuracoes-sistema/current',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Clinica-Slug': 'hemodinks',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, {
      url: '/api/configuracoes-sistema/current',
      method: 'PUT',
      data: {
        nomeEmpresa: 'Clinica Alfa',
        fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
        'X-Clinica-Slug': 'hemodinks',
      },
    });
  });

  it('extrai o contexto da clinica a partir do token JWT', () => {
    const token = createJwtToken({
      clinicaId: '3',
      clinicaSlug: 'clinica-alfa',
    });

    expect(extractClinicaContextFromToken(token)).toEqual({
      clinicaId: 3,
      clinicaSlug: 'clinica-alfa',
    });
  });

  it('resolve slug de clinica a partir de hostname customizado', () => {
    expect(resolveClinicaSlugFromHostname('clinica-alfa.hemodinks.com')).toBe('clinica-alfa');
    expect(resolveClinicaSlugFromHostname('hemodinks-front-confirmation.onrender.com')).toBeNull();
    expect(resolveClinicaSlugFromHostname('localhost')).toBeNull();
  });
});
