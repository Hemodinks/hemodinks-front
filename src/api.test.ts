import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authenticate,
  changePassword,
  createPaciente,
  createUser,
  deletePaciente,
  deletePacienteArquivo,
  deleteUser,
  getPacientes,
  getUsers,
  resetPassword,
  updatePaciente,
  updateUser,
  uploadPacienteArquivo,
} from './api';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('autentica enviando email e senha para a rota correta', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
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
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/users/authenticate', {
      method: 'POST',
      body: JSON.stringify({ email: 'gmarcone@gmail.com', senha: 'Senha@123' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('inclui o token bearer ao buscar usuarios', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await getUsers('jwt-token');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/users/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('monta os payloads de CRUD de pacientes', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ id: 10 }))
      .mockResolvedValueOnce(jsonResponse({ id: 10 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, nomeOriginal: 'laudo.pdf' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const payload = {
      data: null,
      nomePaciente: 'Paciente Hemodinks',
      cpf: '52998224725',
      email: 'paciente@hemodinks.com',
      telefone: '+5581999999999',
      fotoPerfil: null,
      dataNascimento: '1990-01-01',
      hospital: 'Hospital Central',
      medico: 'Dra. Ana',
      convenio: 'Particular',
      procedimento: 'Consulta',
      autorizacao: '',
      pagamento: 'Pix',
      repasseGlosa: '',
      statusPago: true,
      ativo: true,
    };

    await getPacientes('jwt-token');
    await createPaciente(payload, 'jwt-token');
    await updatePaciente(10, payload, 'jwt-token');
    await uploadPacienteArquivo(10, new File(['laudo'], 'laudo.pdf', { type: 'application/pdf' }), 'jwt-token');
    await expect(deletePacienteArquivo(10, 1, 'jwt-token')).resolves.toBeUndefined();
    await expect(deletePaciente(10, 'jwt-token')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:5000/api/pacientes/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:5000/api/pacientes/', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://localhost:5000/api/pacientes/10', {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'http://localhost:5000/api/pacientes/10/arquivos', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
      headers: {
        Authorization: 'Bearer jwt-token',
      },
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, 'http://localhost:5000/api/pacientes/10/arquivos/1', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(6, 'http://localhost:5000/api/pacientes/10', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('monta os payloads de CRUD e troca de senha', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, precisaTrocarSenha: false, message: 'Senha alterada com sucesso' }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, precisaTrocarSenha: true, message: 'Senha resetada para a senha padrao' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const payload = {
      nome: 'Ana Hemodinks',
      email: 'ana@hemodinks.com',
      telefone: '+5581999999999',
      cpf: '52998224725',
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:5000/api/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:5000/api/users/1', {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://localhost:5000/api/users/1/password', {
      method: 'PUT',
      body: JSON.stringify({ senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@123' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'http://localhost:5000/api/users/password/reset', {
      method: 'POST',
      body: JSON.stringify({ email: 'ana@hemodinks.com' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, 'http://localhost:5000/api/users/1', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('normaliza mensagens de erro da API', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Email ja cadastrado' }, { status: 400 }));

    await expect(getUsers('jwt-token')).rejects.toThrow('Email ja cadastrado');
  });

  it('usa mensagem padrao para resposta 401', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(authenticate('email@teste.com', 'senha')).rejects.toThrow('Credenciais invalidas ou sessao expirada.');
  });
});
