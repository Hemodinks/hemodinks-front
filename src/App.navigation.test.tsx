import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildEmptyForm } from './features/events/AgendaPage';
import * as api from './services';
import { CbhpmLookupModal } from './features/patients/CbhpmLookupModal';
import { queryClient } from './queryClient';
import type { AuthSession } from './shared/domain/sessionTypes';
import type { Paciente } from './shared/domain/clinicalContracts';
import type { PacienteObservacao } from './features/patients/patientTypes';
import type { User } from './features/users/userTypes';
import {
  basePaciente,
  baseUser,
  buildMedicalLicense,
  mockSession,
  paged,
  SESSION_KEY,
} from './test/appTestData';
import {
  getVisibleFirstColumnValues,
  openPatientsModule,
  openUsersModule,
  renderAuthenticatedApp,
} from './test/appTestUi';
import { createJwtToken, setupAppTest } from './test/appTestSetup';

vi.mock('./services', async () => {
  const { createAppServicesMock } = await import('./test/appServicesMock');
  return createAppServicesMock();
});

describe('App profiles and navigation', () => {
  beforeEach(setupAppTest);

  it('exibe os cards de Clínicas e Controladoria para Administrador e abre o módulo correto', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(
      await screen.findByRole('button', { name: 'Abrir cadastro de clínicas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir Controladoria' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Abrir faturamento médico' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir Controladoria' }));
    await waitFor(() => expect(window.location.pathname).toBe('/atendimentos-cirurgicos'));
  });

  it('exibe as quantidades de atendimentos e faturamentos na Controladoria', async () => {
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      usersCount: 6,
      activeUsersCount: 6,
      pacientesCount: 82,
      activePatientsCount: 82,
      pendingPaymentsCount: 4,
      attendancesCount: 78,
      billingsCount: 25,
      patientFilesCount: 0,
      upcomingEventsCount: 0,
    });

    const { user } = await renderAuthenticatedApp();
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    const sidebar = within(screen.getByLabelText('Sessão ativa'));
    await user.click(sidebar.getByRole('button', { name: 'Controladoria' }));

    expect(sidebar.getByRole('button', { name: 'Atendimentos: 78' })).toBeInTheDocument();
    expect(sidebar.getByRole('button', { name: 'Faturamento: 25' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /abrir meu cadastro/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));

    expect(
      await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/meu-cadastro');
  });

  it('redireciona medico que tenta acessar usuarios pela URL', async () => {
    await renderAuthenticatedApp({
      initialPath: '/usuarios',
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(api.getUsers).not.toHaveBeenCalled();
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
    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));

    expect(
      await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/meu-cadastro');
    expect(screen.queryByText(/base de usuários/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo usuário/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
    expect(
      await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pacientes/i }));

    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/pacientes');
    });
    expect(
      screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).not.toBeInTheDocument();
  });

  it('permite ao medico navegar pelo menu enquanto o proprio cadastro ainda carrega', async () => {
    let resolveProfile: (user: User) => void = () => {};
    vi.mocked(api.getUser).mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
    expect(
      await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).toBeInTheDocument();

    const sidebar = screen.getByLabelText('Sessão ativa');
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
    expect(
      screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
    expect(
      await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).toBeInTheDocument();
    await user.click(within(sidebar).getByRole('button', { name: /pacientes/i }));
    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();

    await user.click(
      within(screen.getByLabelText('Sessão ativa')).getByRole('button', {
        name: /^meu cadastro$/i,
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 }),
    ).toBeInTheDocument();
    await user.click(
      within(screen.getByLabelText('Sessão ativa')).getByRole('button', {
        name: /agenda e notificações/i,
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Agenda e notificações',
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('abre painel para controller e permite cadastrar, editar e anexar arquivos de pacientes sem foto', async () => {
    const { user } = await renderAuthenticatedApp({
      initialPath: '/dashboard',
      sessionOverrides: {
        perfilId: 4,
        perfilNome: 'Controller',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(screen.queryByRole('button', { name: /abrir usuários/i })).not.toBeInTheDocument();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');

    await user.click(screen.getByRole('button', { name: /abrir pacientes/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar xlsx/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /excluir paciente hemodinks/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));
    expect(await screen.findByRole('heading', { name: 'Novo paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar paciente/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));
    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar paciente/i })).toBeInTheDocument();
    expect(screen.getByText('Selecionar arquivos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
  });

  it('ordena pacientes por registro recente e nome', async () => {
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser]));
    vi.mocked(api.getPacientes).mockResolvedValue(
      paged([
        {
          ...basePaciente,
          id: 13,
          nomePaciente: 'Zelia Antiga',
          email: 'zelia@hemodinks.com',
          cpf: '93541134780',
          fotoPerfil: 'data:image/png;base64,zelia',
          dataAtualizacao: '2026-05-20T09:00:00Z',
        },
        {
          ...basePaciente,
          id: 12,
          nomePaciente: 'Bruno Recente',
          email: 'bruno.paciente@hemodinks.com',
          cpf: '52998224725',
          fotoPerfil: 'data:image/png;base64,bruno',
          dataAtualizacao: '2026-06-03T09:00:00Z',
        },
        {
          ...basePaciente,
          id: 11,
          nomePaciente: 'Ana Recente',
          email: 'ana.paciente@hemodinks.com',
          cpf: '11144477735',
          fotoPerfil: 'data:image/png;base64,ana',
          dataAtualizacao: '2026-06-03T09:00:00Z',
        },
      ]),
    );

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Ana Recente')).toBeInTheDocument();
    expect(getVisibleFirstColumnValues()).toEqual(['Ana Recente', 'Bruno Recente', 'Zelia Antiga']);
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

    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Excluir usuário?',
    });
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

  it('alterna tema claro e escuro', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir configuração do sistema/i }));
    expect(
      await screen.findByRole('heading', {
        name: 'Configuração do sistema',
        level: 1,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /escuro/i }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: /claro/i })).toBeInTheDocument();
  });
});
