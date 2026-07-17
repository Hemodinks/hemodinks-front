import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authenticate,
  changePassword,
  createPaciente,
  createUser,
  deletePaciente,
  deletePacienteArquivo,
  deleteUser,
  deleteUserArquivo,
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
import {
  extractClinicaContextFromToken,
  resolveClinicaSlugFromHostname,
} from './clinicaContext';

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
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse({
      id: 1,
      nome: 'George',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    }));

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
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse({
      id: 1,
      nome: 'George',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    }));

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

    const token = createJwtToken({ clinicaId: '7', clinicaSlug: 'clinica-beta' });

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
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse(new Blob(['avatar'], { type: 'image/png' })),
    );

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
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      axiosResponse(new Blob(['brand'], { type: 'image/png' })),
    );

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
    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(axiosResponse({
      userId: 99,
      featuresEfetivas: ['Pacientes.Visualizar'],
    }));

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
    await uploadPacienteArquivo(10, new File(['laudo'], 'laudo.pdf', { type: 'application/pdf' }), 'jwt-token');
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
    expect(requestSpy).toHaveBeenNthCalledWith(7, expect.objectContaining({
      url: '/api/pacientes/10/arquivos',
      method: 'POST',
      data: expect.any(FormData),
      headers: {
        Authorization: 'Bearer jwt-token',
      },
    }));
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
      axiosResponse({ items: [], page: 2, pageSize: 10, totalItems: 0, totalPages: 1 }),
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
    expect(config?.params?.toString()).toBe('page=2&pageSize=10&search=ana&medico=Dra.+Ana&convenio=Particular&procedimento=Consulta');
  });

  it('carrega todas as paginas da consulta CBHPM para cache local', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(axiosResponse({
        items: [
          { id: 1, codigo: '10101012', procedimento: 'Consulta', porte: '2B' },
        ],
        page: 1,
        pageSize: 100,
        totalItems: 2,
        totalPages: 2,
      }))
      .mockResolvedValueOnce(axiosResponse({
        items: [
          { id: 2, codigo: '20101201', procedimento: 'Avaliacao clinica', porte: '2B' },
        ],
        page: 2,
        pageSize: 100,
        totalItems: 2,
        totalPages: 2,
      }));

    const result = await getAllCbhpmGeral('jwt-token');

    expect(result.map((item) => item.codigo)).toEqual(['10101012', '20101201']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(requestSpy.mock.calls[0]?.[0]?.url).toBe('/api/cbhpm/');
    expect(requestSpy.mock.calls[0]?.[0]?.params?.toString()).toBe('page=1&pageSize=100');
    expect(requestSpy.mock.calls[1]?.[0]?.url).toBe('/api/cbhpm/');
    expect(requestSpy.mock.calls[1]?.[0]?.params?.toString()).toBe('page=2&pageSize=100');
  });

  it('monta os payloads de CRUD e troca de senha', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request');

    requestSpy
      .mockResolvedValueOnce(axiosResponse({ id: 1 }))
      .mockResolvedValueOnce(axiosResponse({ id: 1 }))
      .mockResolvedValueOnce(axiosResponse({ id: 1, precisaTrocarSenha: false, message: 'Senha alterada com sucesso' }))
      .mockResolvedValueOnce(axiosResponse({ id: 1, precisaTrocarSenha: true, message: 'Senha resetada para a senha padrao' }))
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
    await uploadUserArquivo(2, new File(['crm'], 'crm.pdf', { type: 'application/pdf' }), 'jwt-token');
    await expect(deleteUserArquivo(2, 7, 'jwt-token')).resolves.toBeUndefined();

    expect(requestSpy).toHaveBeenNthCalledWith(1, {
      url: '/api/users/2',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/api/users/2/arquivos',
      method: 'POST',
      data: expect.any(FormData),
      headers: {
        Authorization: 'Bearer jwt-token',
      },
    }));
    expect(requestSpy).toHaveBeenNthCalledWith(3, {
      url: '/api/users/2/arquivos/7',
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('consulta feriados nacionais pela API publica com axios', async () => {
    const requestSpy = vi.spyOn(publicApiClient, 'request').mockResolvedValueOnce(axiosResponse([
      { date: '2026-01-01', localName: 'Confraternizacao Universal', name: 'New Year', countryCode: 'BR', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] },
    ]));

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
      .mockResolvedValueOnce(axiosResponse({ id: 1, nomeEmpresa: 'Hemodinks', fotoEmpresa: null, dataCadastro: '2026-06-22T00:00:00Z', dataAtualizacao: null }))
      .mockResolvedValueOnce(axiosResponse({ id: 1, nomeEmpresa: 'Clinica Alfa', fotoEmpresa: 'data:image/png;base64,YnJhbmQ=', dataCadastro: '2026-06-22T00:00:00Z', dataAtualizacao: '2026-06-22T12:00:00Z' }));

    await expect(getSystemSettings()).resolves.toMatchObject({ nomeEmpresa: 'Hemodinks' });
    await expect(updateSystemSettings({
      nomeEmpresa: 'Clinica Alfa',
      fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
    }, 'jwt-token')).resolves.toMatchObject({ nomeEmpresa: 'Clinica Alfa' });

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
    const token = createJwtToken({ clinicaId: '3', clinicaSlug: 'clinica-alfa' });

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

  it('normaliza mensagens de erro da API', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(apiError(400, { message: 'Email ja cadastrado' }));

    await expect(getUsers('jwt-token')).rejects.toThrow('Email ja cadastrado');
  });

  it('usa mensagem padrao para resposta 401', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(apiError(401));

    await expect(authenticate('email@teste.com', 'senha')).rejects.toThrow('Credenciais invalidas ou sessao expirada.');
  });

  it('notifica a aplicacao quando uma chamada autenticada retorna 401', async () => {
    const authExpiredHandler = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, authExpiredHandler);
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(apiError(401));

    await expect(getUsers('jwt-token')).rejects.toThrow('Credenciais invalidas ou sessao expirada.');

    expect(authExpiredHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, authExpiredHandler);
  });

  it('usa mensagem especifica ao falhar consulta de feriados nacionais', async () => {
    vi.spyOn(publicApiClient, 'request').mockRejectedValueOnce(apiError(503));

    await expect(getBrazilPublicHolidays(2026)).rejects.toThrow('Nao foi possivel carregar feriados nacionais.');
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
