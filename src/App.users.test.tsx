vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './services';
import type { Paciente, User } from './types';
import { baseUser, paged } from './test/appTestData';
import { getVisibleFirstColumnValues, openUsersModule, renderAuthenticatedApp } from './test/appTestUi';
import { resetAppTestState } from './test/appTestSetup';

describe('App — usuários e meu cadastro', () => {
  beforeEach(resetAppTestState);

  it('carrega foto de perfil pela API e exibe iniciais se a imagem falhar', async () => {
    await renderAuthenticatedApp({
      sessionOverrides: {
        nome: 'George Marcone',
        fotoPerfil: '/profile-photos/george.png',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getUserProfilePhoto).toHaveBeenCalledWith(99, 'jwt-token');
    });

    const avatar = await screen.findByAltText('Foto de George Marcone');
    expect(avatar).toHaveAttribute('src', 'blob:hemodinks-avatar');

    fireEvent.error(avatar);

    expect(screen.getByLabelText('Sem foto de George Marcone')).toBeInTheDocument();
  });

  it('cadastra usuario com senha inicial padrao e recarrega a lista', async () => {
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 2,
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581888888888',
      cpf: '11144477735',
      fotoPerfil: null,
      dataNascimento: '1992-05-10T00:00:00Z',
      precisaTrocarSenha: true,
      perfilId: 2,
      perfilNome: 'Médicos',
    });

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo usuário/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Bruno Hemodinks');
    await user.type(await screen.findByLabelText('Email'), 'bruno@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81988888888');
    await user.type(screen.getByLabelText('Data de nascimento'), '10051992');
    expect(screen.getByLabelText('Perfil')).toHaveValue('2');
    await user.type(screen.getByLabelText('CRM'), '12345');
    await user.selectOptions(screen.getByLabelText('UF do CRM'), 'PE');
    await user.click(screen.getByRole('button', { name: /cadastrar usuário/i }));

    expect(api.createUser).toHaveBeenCalledWith({
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581988888888',
      cpf: null,
      crm: '12345',
      crmUf: 'PE',
      fotoPerfil: null,
      dataNascimento: '1992-05-10',
      ativo: true,
      perfilId: 2,
    }, 'jwt-token');
    expect(await screen.findByText('Usuário cadastrado com senha temporária. Oriente a alteração no primeiro acesso.')).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(2);
  });

  it('permite anexar foto de perfil no cadastro', async () => {
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 3,
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      telefone: '+5581997777777',
      cpf: '93541134780',
      fotoPerfil: 'data:image/png;base64,YXZhdGFy',
      dataNascimento: '1991-03-12T00:00:00Z',
      precisaTrocarSenha: true,
    });

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo usuário/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Clara Hemodinks');
    await user.type(await screen.findByLabelText('Email'), 'clara@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81997777777');
    await user.type(screen.getByLabelText('CRM'), '98765');
    await user.selectOptions(screen.getByLabelText('UF do CRM'), 'SP');
    await user.upload(
      screen.getByLabelText('Foto do perfil'),
      new File(['avatar'], 'avatar.png', { type: 'image/png' }),
    );

    expect(await screen.findByAltText('Foto de Clara Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cadastrar usuário/i }));

    expect(api.createUser).toHaveBeenCalledWith({
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      telefone: '+5581997777777',
      cpf: null,
      crm: '98765',
      crmUf: 'SP',
      fotoPerfil: 'data:image/png;base64,YXZhdGFy',
      dataNascimento: null,
      ativo: true,
      perfilId: 2,
    }, 'jwt-token');
  });

  it('filtra usuarios pelo campo de busca', async () => {
    vi.mocked(api.getUsers)
      .mockResolvedValueOnce(paged([
      baseUser,
      {
        ...baseUser,
        id: 2,
        nome: 'Carlos Hemodinks',
        email: 'carlos@hemodinks.com',
        telefone: '+5581777777777',
      },
    ]))
      .mockResolvedValueOnce(paged([
        {
          ...baseUser,
          id: 2,
          nome: 'Carlos Hemodinks',
          email: 'carlos@hemodinks.com',
          telefone: '+5581777777777',
        },
      ]));

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Carlos Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar'), 'carlos');

    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: 'carlos', sortBy: 'recent', sortDirection: 'desc' });
    });

    expect(await screen.findByText('Carlos Hemodinks')).toBeInTheDocument();
    expect(screen.queryByText('Ana Hemodinks')).not.toBeInTheDocument();
  });

  it('preserva a ordem dos usuarios recebida da API mesmo com datas de atualizacao diferentes', async () => {
    vi.mocked(api.getUsers).mockResolvedValue(paged([
      {
        ...baseUser,
        id: 3,
        nome: 'Carlos Antigo',
        email: 'carlos@hemodinks.com',
        dataCadastro: '2026-05-20T09:00:00Z',
        dataAtualizacao: '2026-05-21T09:00:00Z',
      },
      {
        ...baseUser,
        id: 2,
        nome: 'Bruno Recente',
        email: 'bruno@hemodinks.com',
        dataCadastro: '2026-06-01T09:00:00Z',
        dataAtualizacao: '2026-06-03T09:00:00Z',
      },
      {
        ...baseUser,
        id: 1,
        nome: 'Ana Recente',
        email: 'ana.recente@hemodinks.com',
        dataCadastro: '2026-06-01T08:00:00Z',
        dataAtualizacao: '2026-06-03T09:00:00Z',
      },
    ]));

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Recente')).toBeInTheDocument();
    expect(getVisibleFirstColumnValues()).toEqual(['Carlos Antigo', 'Bruno Recente', 'Ana Recente']);
  });

  it('permite ordenar usuarios pelos cabeçalhos da tabela', async () => {
    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^nome$/i }));

    await waitFor(() => {
      expect(api.getUsers).toHaveBeenLastCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'nome', sortDirection: 'asc' });
    });
  });

  it('nao exibe perfil paciente no cadastro de usuario', async () => {
    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    await user.click(screen.getByRole('button', { name: /novo usuário/i }));
    expect(await screen.findByRole('option', { name: 'Médicos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Paciente' })).not.toBeInTheDocument();
  });

  it('permite ao perfil paciente abrir meu cadastro', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 3,
        perfilNome: 'Paciente',
        nome: 'Paciente George',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i })).toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i }));

    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/meu-cadastro');
  });

  it('permite equipe consultar seus usuarios e pacientes sem gerenciar usuarios ou grupos medicos', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 6,
        perfilNome: 'Equipe',
        nome: 'Equipe Cirúrgica',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    const sidebar = screen.getByLabelText('Menu da clínica');
    expect(within(sidebar).getByRole('button', { name: /^usuários/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /pacientes - cirurgias/i })).toBeInTheDocument();
    expect(within(sidebar).queryByRole('button', { name: /grupos médicos/i })).not.toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: /^usuários/i }));
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledWith('jwt-token', {
      page: 1,
      pageSize: 10,
      search: '',
      sortBy: 'recent',
      sortDirection: 'desc',
    });
    expect(screen.queryByRole('button', { name: /novo usuário/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar ana hemodinks/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir ana hemodinks/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /detalhes de ana hemodinks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contato de ana hemodinks/i })).toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: /pacientes - cirurgias/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir paciente hemodinks/i })).not.toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: /agenda e notificações/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeInTheDocument();
    expect(api.getAgendaEvents).toHaveBeenCalledWith('jwt-token', expect.any(String), expect.any(String));
    expect(api.getAgendaNotificationRecipientOptions).toHaveBeenCalledWith('jwt-token', {
      search: '',
      profile: 'all',
      page: 1,
    });
    expect(window.location.pathname).toBe('/agenda');
  });

  it('permite ao medico fechar o proprio cadastro e voltar ao painel', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i }));

    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/meu-cadastro');
    expect(screen.queryByText(/base de usuários/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo usuário/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 })).not.toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pacientes/i }));

    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/pacientes');
    });
    expect(screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 })).not.toBeInTheDocument();
  });

  it('permite ao medico navegar pelo menu enquanto o proprio cadastro ainda carrega', async () => {
    let resolveProfile: (user: User) => void = () => {};
    vi.mocked(api.getUser).mockReturnValue(new Promise((resolve) => {
      resolveProfile = resolve;
    }));

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();

    const sidebar = screen.getByLabelText('Menu da clínica');
    await user.click(within(sidebar).getByRole('button', { name: /^painel$/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });

    resolveProfile({
      ...baseUser,
      id: 99,
      nome: 'Dra. Ana',
      perfilId: 2,
      perfilNome: 'Medicos',
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 })).not.toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(within(sidebar).getByRole('button', { name: /pacientes/i }));
    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /agenda e notificações/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeInTheDocument();
  });

  it('abre popup de informacoes, preenche o formulario ao editar e exclui usuario', async () => {
    vi.mocked(api.updateUser).mockResolvedValue(baseUser);
    vi.mocked(api.deleteUser).mockResolvedValue(undefined);

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    const row = await screen.findByText('Ana Hemodinks');
    const tableRow = row.closest('tr')!;

    await user.click(within(tableRow).getByLabelText('Detalhes de Ana Hemodinks'));

    const infoDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(infoDialog).toBeInTheDocument();
    expect(within(infoDialog).getByText('Data de nascimento')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Perfil')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Médicos')).toBeInTheDocument();
    expect(within(infoDialog).getByText('CRM')).toBeInTheDocument();
    expect(within(infoDialog).getByText('12345')).toBeInTheDocument();
    expect(within(infoDialog).getByText('UF do CRM')).toBeInTheDocument();
    expect(within(infoDialog).getByText('PE')).toBeInTheDocument();
    expect(within(infoDialog).getByText('01/01/1990')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Senha alterada')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Ativo')).toBeInTheDocument();
    await user.click(within(infoDialog).getByRole('button', { name: /copiar cpf/i }));
    expect(await within(infoDialog).findByText('Copiado')).toBeInTheDocument();
    await user.click(screen.getByTitle('Fechar'));

    await user.click(within(tableRow).getByLabelText('Contato de Ana Hemodinks'));

    const contactDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(within(contactDialog).getByText('Email')).toBeInTheDocument();
    expect(within(contactDialog).getByText('Telefone')).toBeInTheDocument();
    expect(within(contactDialog).getByText('ana@hemodinks.com')).toBeInTheDocument();
    await user.click(within(contactDialog).getByRole('button', { name: /copiar email/i }));
    expect(await within(contactDialog).findByText('Copiado')).toBeInTheDocument();
    await user.click(screen.getByTitle('Fechar'));

    await user.click(within(tableRow).getByTitle('Editar'));

    expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Hemodinks');
    expect(screen.getByLabelText('Telefone')).toHaveValue('+55 (81) 99999-9999');
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Data de nascimento')).toHaveValue('01/01/1990');
    expect(screen.getByLabelText('Perfil')).toHaveValue('2');
    expect(screen.getByLabelText('CRM')).toHaveValue('12345');
    expect(screen.getByLabelText('UF do CRM')).toHaveValue('PE');

    await user.click(screen.getByTitle('Voltar para lista'));
    const deleteRow = (await screen.findByText('Ana Hemodinks')).closest('tr')!;
    await user.click(within(deleteRow).getByTitle('Excluir'));

    const confirmDialog = await screen.findByRole('dialog', { name: 'Excluir usuário?' });
    expect(within(confirmDialog).getByText(/Deseja excluir "Ana Hemodinks"/i)).toBeInTheDocument();
    expect(api.deleteUser).not.toHaveBeenCalled();

    await user.click(within(confirmDialog).getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(1, 'jwt-token'));
    expect(await screen.findByText('Usuário excluído.')).toBeInTheDocument();
  });

  it('pagina a lista com 10 registros por tela', async () => {
    const allUsers = Array.from({ length: 12 }, (_, index) => ({
      ...baseUser,
      id: index + 1,
      nome: `Usuario ${index + 1}`,
      email: `usuario${index + 1}@hemodinks.com`,
      telefone: '+5581999999999',
    }));
    vi.mocked(api.getUsers).mockReset();
    vi.mocked(api.getUsers)
      .mockResolvedValueOnce(paged(allUsers.slice(0, 10), 1, 10, 12))
      .mockResolvedValueOnce(paged(allUsers.slice(10), 2, 10, 12))
      .mockResolvedValue(paged(allUsers.slice(10), 2, 10, 12));

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Usuario 1')).toBeInTheDocument();
    expect(screen.getByText('Usuario 10')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 11')).not.toBeInTheDocument();
    expect(screen.getByText('1-10 de 12')).toBeInTheDocument();

    await user.click(screen.getByTitle('Próxima página'));

    expect(await screen.findByText('Usuario 11')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 1')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('11-12 de 12')).toBeInTheDocument();
    });
  });
});
