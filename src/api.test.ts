import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authenticate,
  changePassword,
  createUser,
  deleteUser,
  getUsers,
  updateUser,
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

  it('monta os payloads de CRUD e troca de senha', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, precisaTrocarSenha: false, message: 'Senha alterada com sucesso' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const payload = {
      nome: 'Ana Hemodinks',
      email: 'ana@hemodinks.com',
      telefone: '+5581999999999',
      fotoPerfil: null,
      dataNascimento: '1990-01-01',
      ativo: true,
      perfilId: 2,
    };

    await createUser(payload, 'jwt-token');
    await updateUser(1, payload, 'jwt-token');
    await changePassword(1, { senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@123' }, 'jwt-token');
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
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'http://localhost:5000/api/users/1', {
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
