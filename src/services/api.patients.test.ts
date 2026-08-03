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

  it('monta os payloads de CRUD de pacientes', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(axiosResponse([]))
      .mockResolvedValueOnce(axiosResponse([{ id: 1, nome: 'Santa Clara - Mater Dei' }]))
      .mockResolvedValueOnce(axiosResponse([{ idConvenio: 7, descricaoConvenio: 'Particular' }]))
      .mockResolvedValueOnce(axiosResponse([{ idFornecedor: 1, fornecedor: 'Promedom' }]))
      .mockResolvedValueOnce(axiosResponse({ id: 10 }))
      .mockResolvedValueOnce(axiosResponse({ id: 10 }))
      .mockResolvedValueOnce(axiosResponse({ id: 1, nomeOriginal: 'laudo.pdf' }))
      .mockResolvedValueOnce(axiosResponse(undefined, 204))
      .mockResolvedValueOnce(axiosResponse(undefined, 204));

    const payload = {
      data: null,
      nomePaciente: 'Paciente Hemodinks',
      diagnostico: 'Doenca renal cronica',
      tratamentoMedico: 'Tratamento conservador',
      cpf: '52998224725',
      email: 'paciente@hemodinks.com',
      telefone: '+5581999999999',
      fotoPerfil: null,
      dataNascimento: '1990-01-01',
      hospitalId: 1,
      hospital: 'Santa Clara - Mater Dei',
      medicoUserId: 1,
      medico: 'Dra. Ana',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Dr. Bruno',
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: '',
      convenioId: 7,
      convenio: 'Particular',
      opmeFornecedorId: 1,
      opmeFornecedor: 'Promedom',
      cbhpmCodigo: '1.01.01.01-2',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      procedimentos: [
        {
          cbhpmCodigo: '1.01.01.01-2',
          cbhpmPorte: '2B',
          procedimento: 'Consulta',
          valorReferencia: 120,
        },
      ],
      autorizacao: '',
      pagamento: 'Pix',
      repasseGlosa: '',
      statusPago: true,
      ativo: true,
    };

    await getPacientes('jwt-token');
    await getHospitais('jwt-token');
    await getConvenios('jwt-token');
    await getOpmeFornecedores('jwt-token');
    await createPaciente(payload, 'jwt-token');
    await updatePaciente(10, payload, 'jwt-token');
    await uploadPacienteArquivo(
      10,
      new File(['laudo'], 'laudo.pdf', { type: 'application/pdf' }),
      'jwt-token',
    );
    await expect(deletePacienteArquivo(10, 1, 'jwt-token')).resolves.toBeUndefined();
    await expect(deletePaciente(10, 'jwt-token')).resolves.toBeUndefined();

    expect(requestSpy).toHaveBeenNthCalledWith(1, {
      url: '/api/pacientes/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, {
      url: '/api/hospitais/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(3, {
      url: '/api/convenios/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(4, {
      url: '/api/opme/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(5, {
      url: '/api/pacientes/',
      method: 'POST',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(6, {
      url: '/api/pacientes/10',
      method: 'PUT',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        url: '/api/pacientes/10/arquivos',
        method: 'POST',
        data: expect.any(FormData),
        headers: {
          Authorization: 'Bearer jwt-token',
        },
      }),
    );
    expect(requestSpy).toHaveBeenNthCalledWith(8, {
      url: '/api/pacientes/10/arquivos/1',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(9, {
      url: '/api/pacientes/10',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('monta filtros administrativos da lista de pacientes', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse({
        items: [],
        page: 2,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      }),
    );

    await getPacientes('jwt-token', {
      page: 2,
      pageSize: 10,
      search: 'ana',
      medico: 'Dra. Ana',
      convenio: 'Particular',
      procedimento: 'Consulta',
    });

    const config = requestSpy.mock.calls[0]?.[0];
    expect(config?.url).toBe('/api/pacientes/');
    expect(config?.method).toBe('GET');
    expect(config?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-token',
    });
    expect(config?.params?.toString()).toBe(
      'page=2&pageSize=10&search=ana&medico=Dra.+Ana&convenio=Particular&procedimento=Consulta',
    );
  });

  it('carrega todas as paginas da consulta CBHPM para cache local', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(
        axiosResponse({
          items: [
            {
              id: 1,
              codigo: '10101012',
              procedimento: 'Consulta',
              porte: '2B',
            },
          ],
          page: 1,
          pageSize: 100,
          totalItems: 2,
          totalPages: 2,
        }),
      )
      .mockResolvedValueOnce(
        axiosResponse({
          items: [
            {
              id: 2,
              codigo: '20101201',
              procedimento: 'Avaliacao clinica',
              porte: '2B',
            },
          ],
          page: 2,
          pageSize: 100,
          totalItems: 2,
          totalPages: 2,
        }),
      );

    const result = await getAllCbhpmGeral('jwt-token');

    expect(result.map((item) => item.codigo)).toEqual(['10101012', '20101201']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(requestSpy.mock.calls[0]?.[0]?.url).toBe('/api/cbhpm/');
    expect(requestSpy.mock.calls[0]?.[0]?.params?.toString()).toBe('page=1&pageSize=100');
    expect(requestSpy.mock.calls[1]?.[0]?.url).toBe('/api/cbhpm/');
    expect(requestSpy.mock.calls[1]?.[0]?.params?.toString()).toBe('page=2&pageSize=100');
  });

  it('mantem o carregamento de observacoes do paciente no servico dedicado', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse([]));

    await getPacienteObservacoes(10, 'jwt-token');

    expect(requestSpy).toHaveBeenCalledWith({
      url: '/api/pacientes/10/observacoes',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });
});
