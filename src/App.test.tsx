import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './api';
import type { AuthSession, User } from './types';

vi.mock('./api', () => ({
  authenticate: vi.fn(),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  changePassword: vi.fn(),
}));

const SESSION_KEY = 'hemodinks.session';

const baseUser: User = {
  id: 1,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  telefone: '+5581999999999',
  dataCadastro: '2026-06-01T00:00:00Z',
  dataNascimento: '1990-01-01T00:00:00Z',
  ativo: true,
  precisaTrocarSenha: false,
};

function mockSession(overrides?: Partial<AuthSession['user']>) {
  const session: AuthSession = {
    token: 'jwt-token',
    user: {
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      precisaTrocarSenha: false,
      ...overrides,
    },
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(api.getUsers).mockResolvedValue([baseUser]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('faz login, salva a sessao JWT e carrega usuarios', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      precisaTrocarSenha: false,
    });

    render(<App />);

    expect(screen.getByText('GM Tech Solutions')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'Senha@123');
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledWith('jwt-token');

    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') as AuthSession;
    expect(storedSession.token).toBe('jwt-token');
    expect(storedSession.user.precisaTrocarSenha).toBe(false);
  });

  it('bloqueia o primeiro acesso ate a troca da senha padrao', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      precisaTrocarSenha: true,
    });
    vi.mocked(api.changePassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: false,
      message: 'Senha alterada com sucesso',
    });

    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Troque sua senha' })).toBeInTheDocument();
    expect(api.getUsers).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Senha atual'), 'Senha@123');
    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha@123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(api.changePassword).toHaveBeenCalledWith(
      99,
      { senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@123' },
      'jwt-token',
    );
    expect(await screen.findByText('Senha alterada com sucesso')).toBeInTheDocument();
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
  });

  it('cadastra usuario com senha inicial padrao e recarrega a lista', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 2,
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581888888888',
      dataNascimento: '1992-05-10T00:00:00Z',
      precisaTrocarSenha: true,
    });

    render(<App />);

    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome completo'), 'Bruno Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'bruno@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '+5581888888888');
    await user.type(screen.getByLabelText('Data de nascimento'), '1992-05-10');
    await user.click(screen.getByRole('button', { name: /cadastrar usuario/i }));

    expect(api.createUser).toHaveBeenCalledWith({
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581888888888',
      dataNascimento: '1992-05-10',
      ativo: true,
    }, 'jwt-token');
    expect(await screen.findByText('Usuario cadastrado com senha inicial Senha@123.')).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(2);
  });

  it('filtra usuarios pelo campo de busca', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.getUsers).mockResolvedValue([
      baseUser,
      {
        ...baseUser,
        id: 2,
        nome: 'Carlos Hemodinks',
        email: 'carlos@hemodinks.com',
        telefone: '+5581777777777',
      },
    ]);

    render(<App />);

    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Carlos Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar'), 'carlos');

    expect(screen.queryByText('Ana Hemodinks')).not.toBeInTheDocument();
    expect(screen.getByText('Carlos Hemodinks')).toBeInTheDocument();
  });

  it('preenche o formulario ao editar e exclui usuario com confirmacao', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.updateUser).mockResolvedValue(baseUser);
    vi.mocked(api.deleteUser).mockResolvedValue(undefined);

    render(<App />);

    const row = await screen.findByText('Ana Hemodinks');
    const tableRow = row.closest('tr')!;

    await user.click(within(tableRow).getByTitle('Editar'));

    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Hemodinks');

    await user.click(within(tableRow).getByTitle('Excluir'));

    expect(window.confirm).toHaveBeenCalledWith('Excluir Ana Hemodinks?');
    expect(api.deleteUser).toHaveBeenCalledWith(1, 'jwt-token');
    expect(await screen.findByText('Usuario excluido.')).toBeInTheDocument();
  });
});
