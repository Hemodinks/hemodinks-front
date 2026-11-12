vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEmptyForm } from './features/events/AgendaPage';
import * as api from './services';
import type { Paciente, User } from './types';
import { baseUser, buildMedicalLicense, paged } from './test/appTestData';
import { openUsersModule, renderAuthenticatedApp } from './test/appTestUi';
import { resetAppTestState } from './test/appTestSetup';

describe('App — navegação, permissões, agenda e configurações', () => {
  beforeEach(resetAppTestState);

  it('libera menu administrativo completo e CRUD de clinicas para superadministrador', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: { perfilId: 5, perfilNome: 'SuperAdministrador' },
    });
    vi.mocked(api.listPlatformClinics).mockResolvedValue([]);

    const sidebar = await screen.findByLabelText('Menu da clínica');
    expect(within(sidebar).getByRole('button', { name: /usuários/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /pacientes/i })).toBeInTheDocument();
    const billingMenu = within(sidebar).getByRole('button', { name: /^faturamento/i });
    expect(billingMenu).toHaveAttribute('aria-expanded', 'false');
    await user.click(billingMenu);
    expect(billingMenu).toHaveAttribute('aria-expanded', 'true');
    expect(within(sidebar).getByRole('button', { name: /gestão de faturamento/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^relatórios$/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /grupos médicos/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^clínicas$/i })).toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: /^clínicas$/i }));
    expect(await screen.findByRole('heading', { name: 'Clínicas', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('0 clinicas cadastradas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /nova clinica/i }));
    const planSelect = screen.getByLabelText('Plano');
    expect(planSelect).toHaveValue('Trial');
    expect(within(planSelect).getByRole('option', { name: 'Completa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Trial ate')).toBeInTheDocument();
    await user.selectOptions(planSelect, 'Completa');
    expect(screen.queryByLabelText('Trial ate')).not.toBeInTheDocument();
    await user.selectOptions(planSelect, 'Parcial');
    expect(screen.queryByLabelText('Trial ate')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Módulos contratados' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pacientes')).toBeInTheDocument();
    const clinicPassword = screen.getByLabelText('Senha inicial');
    expect(clinicPassword).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha inicial' }));
    expect(clinicPassword).toHaveAttribute('type', 'text');

    const navigationButtons = within(within(sidebar).getByRole('navigation', { name: 'Navegação principal' })).getAllByRole('button');
    expect(navigationButtons.at(-1)).toHaveTextContent('Tutoriais interativos');
  });

  it('permite ao superadministrador editar o próprio perfil sem rebaixá-lo', async () => {
    const ownUser: User = {
      ...baseUser,
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      telefone: '+5581999999999',
      crm: null,
      crmUf: null,
      perfilId: 5,
      perfilNome: 'SuperAdministrador',
    };
    vi.mocked(api.getUsers).mockResolvedValue(paged([ownUser]));
    vi.mocked(api.getUser).mockResolvedValue(ownUser);
    vi.mocked(api.updateUser).mockResolvedValue({ ...ownUser, nome: 'George Marcone Atualizado' });
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        id: ownUser.id,
        nome: ownUser.nome,
        email: ownUser.email,
        perfilId: ownUser.perfilId,
        perfilNome: ownUser.perfilNome,
      },
    });

    await openUsersModule(user);
    const row = await screen.findByRole('row', { name: /George Marcone/ });
    await user.click(within(row).getByTitle('Editar'));

    const profileSelect = screen.getByLabelText('Perfil');
    expect(profileSelect).toHaveValue('5');
    expect(within(profileSelect).getByRole('option', { name: 'SuperAdministrador' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Nome completo'));
    await user.type(screen.getByLabelText('Nome completo'), 'George Marcone Atualizado');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith(
      ownUser.id,
      expect.objectContaining({ perfilId: 5, nome: 'George Marcone Atualizado' }),
      'jwt-token',
    ));
  });

  it('exibe todos os módulos ao superadministrador mesmo em plano parcial', async () => {
    await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 5,
        perfilNome: 'SuperAdministrador',
        modulosLiberados: ['pacientes'],
      },
    });

    const sidebar = await screen.findByLabelText('Menu da clínica');
    expect(within(sidebar).getByRole('button', { name: /pacientes/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /usuários/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^faturamento/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /agenda e notificações/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^clínicas$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pacientes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^agenda e notificações/i })).toBeInTheDocument();
  });

  it('nao exibe erro no dashboard quando o resumo retorna 403 para medico', async () => {
    vi.mocked(api.getDashboardSummary).mockRejectedValue(new Error('Request failed with status code 403'));

    await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense(),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
    });
    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });
    });
    expect(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^pacientes/i })).toHaveTextContent('1');
    expect((await screen.findAllByLabelText('Indicador indisponível')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/request failed with status code 403/i)).not.toBeInTheDocument();
  });

  it('abre a agenda por URL direta', async () => {
    const { user } = await renderAuthenticatedApp({ initialPath: '/agenda' });

    expect(await screen.findByRole('heading', { name: 'Agenda e notificações' })).toBeInTheDocument();
    const newEventButtons = await screen.findAllByRole('button', { name: /^novo evento$/i });
    expect(newEventButtons[0]).toBeInTheDocument();
    await user.click(newEventButtons[0]);
    expect(await screen.findByRole('heading', { name: 'Novo evento', level: 2 })).toBeInTheDocument();
    expect(api.getAgendaEvents).toHaveBeenCalled();
  });

  it('mantem o formulario da agenda valido quando o horario padrao cruza a meia-noite', () => {
    const form = buildEmptyForm('2026-07-02', false, undefined, new Date(2026, 6, 2, 22, 20, 0));

    expect(form.startDate).toBe('2026-07-02');
    expect(form.startTime).toBe('23:00');
    expect(form.endDate).toBe('2026-07-03');
    expect(form.endTime).toBe('00:00');
  });

  it('exclui apenas o evento clicado na agenda', async () => {
    const today = new Date();
    // The selected agenda day is local; UTC literals can move an event to tomorrow.
    const atLocalHour = (hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour).toISOString();
    vi.mocked(api.getAgendaEvents).mockResolvedValue([
      {
        id: 101,
        userId: 1,
        userName: 'George Marcone',
        medicalUserId: null,
        medicalUserName: null,
        title: 'Evento A',
        description: 'Primeiro evento',
        start: atLocalHour(12),
        end: atLocalHour(13),
        notifyMedicalProfile: false,
        notifyUser: false,
        reminderPeriodMinutes: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        isCompleted: false,
        completedAt: null,
        createdAt: atLocalHour(11),
        updatedAt: null,
      },
      {
        id: 202,
        userId: 1,
        userName: 'George Marcone',
        medicalUserId: null,
        medicalUserName: null,
        title: 'Evento B',
        description: 'Segundo evento',
        start: atLocalHour(15),
        end: atLocalHour(16),
        notifyMedicalProfile: false,
        notifyUser: false,
        reminderPeriodMinutes: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        isCompleted: false,
        completedAt: null,
        createdAt: atLocalHour(14),
        updatedAt: null,
      },
    ]);

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /agenda e notificações/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Evento A$/ })).toBeInTheDocument();
    const selectedDay = await screen.findByRole('region', { name: 'Eventos da data selecionada' });
    const eventCards = await within(selectedDay).findAllByRole('article');
    expect(eventCards).toHaveLength(2);
    const eventCard = eventCards.find(card => within(card).queryByText('Evento A'));
    expect(eventCard).toBeDefined();

    await user.click(within(eventCard as HTMLElement).getByLabelText('Excluir'));

    const confirmDialog = await screen.findByRole('dialog', { name: 'Excluir evento?' });
    expect(within(confirmDialog).getByText(/Deseja excluir "Evento A"/i)).toBeInTheDocument();
    expect(api.deleteAgendaEvent).not.toHaveBeenCalled();

    await user.click(within(confirmDialog).getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(api.deleteAgendaEvent).toHaveBeenCalledWith(101, 'jwt-token'));
    expect(api.deleteAgendaEvent).toHaveBeenCalledTimes(1);
    expect(api.deleteAgendaEvent).not.toHaveBeenCalledWith(202, 'jwt-token');
  });

  it('alterna entre tema claro e escuro no painel logado', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('hemodinks.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: /^opções$/i }));
    expect(await screen.findByRole('heading', { name: 'Opções', level: 1 })).toBeInTheDocument();

    await user.click(screen.getByTitle('Usar tema claro'));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('hemodinks.theme')).toBe('light');

    await user.click(screen.getByTitle('Usar tema escuro'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('hemodinks.theme')).toBe('dark');
  });

  it('remove a edicao da marca das configuracoes do sistema', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^opções$/i }));
    expect(await screen.findByRole('heading', { name: 'Opções', level: 1 })).toBeInTheDocument();

    expect(screen.queryByLabelText('Nome exibido no sistema')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto da empresa')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tema do sistema' })).toBeInTheDocument();
    expect(api.updateSystemSettings).not.toHaveBeenCalled();
  });

  it('abre o monitoramento dentro de opções e apresenta os campos técnicos do erro', async () => {
    vi.mocked(api.getMonitoringErrors).mockResolvedValue({
      items: [{
        timestamp: '2026-08-25T18:45:00-03:00',
        module: 'Pacientes',
        classFlow: ['HemodinksAPI.Application.Features.Pacientes.GetPaciente', 'HemodinksAPI.Api.PacienteEndpointExtensions'],
        method: 'Handle',
        line: 57,
        technicalDescription: 'System.InvalidOperationException: Falha técnica',
        userName: 'George Marcone',
        userEmail: 'george@example.com',
        query: 'SELECT [p].[Id] FROM [Pacientes] AS [p]',
        databaseOperation: 'SELECT',
        requestId: 'request-123',
      }],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1,
    });
    const { user } = await renderAuthenticatedApp();

    await user.click(await screen.findByRole('button', { name: /^opções$/i }));
    await user.click(await screen.findByRole('button', { name: 'Monitoramento' }));

    expect(await screen.findByText('System.InvalidOperationException: Falha técnica')).toBeInTheDocument();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getAllByText('George Marcone').length).toBeGreaterThan(0);
    expect(screen.getByText('george@example.com')).toBeInTheDocument();
    expect(screen.getByText('57')).toBeInTheDocument();
    expect(api.getMonitoringErrors).toHaveBeenCalledWith('jwt-token', 1);

    await user.click(screen.getByRole('button', { name: 'Limpar logs' }));
    const dialog = await screen.findByRole('dialog', { name: 'Limpar logs de erro?' });
    await user.click(within(dialog).getByRole('button', { name: 'Limpar logs' }));

    await waitFor(() => expect(api.clearMonitoringErrors).toHaveBeenCalledWith('jwt-token'));
    expect(await screen.findByText('Logs de erro limpos com sucesso.')).toBeInTheDocument();
    expect(screen.queryByText('System.InvalidOperationException: Falha técnica')).not.toBeInTheDocument();
  });

  it('oculta configuracao para medico e bloqueia a rota direta', async () => {
    await renderAuthenticatedApp({
      initialPath: '/configuracoes',
      sessionOverrides: { perfilId: 2, perfilNome: 'Médicos' },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^opções$/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('leva medico para o painel ao entrar mesmo quando a URL inicial e meu cadastro', async () => {
    await renderAuthenticatedApp({
      initialPath: '/meu-cadastro',
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
  });

  it('abre as notificacoes do usuario logado', async () => {
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      usersCount: 1,
      activeUsersCount: 1,
      pacientesCount: 1,
      activePatientsCount: 1,
      pendingPaymentsCount: 1,
      patientFilesCount: 0,
      upcomingEventsCount: 0,
    });
    vi.mocked(api.getDashboardNotifications).mockResolvedValue([
      {
        id: 10,
        tipo: 'PagamentoPendente',
        titulo: 'Pagamento pendente',
        mensagem: 'Paciente Paciente Hemodinks possui pagamento pendente.',
        pacienteId: 10,
        nomePaciente: 'Paciente Hemodinks',
        medico: 'Dra. Ana',
        procedimento: 'Consulta',
        data: '2026-06-01T00:00:00Z',
      },
    ]);

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^notificações/i }));

    expect(api.getDashboardNotifications).toHaveBeenCalledWith('jwt-token');

    const dialog = await screen.findByRole('dialog', { name: 'Notificações' });
    expect(within(dialog).getByText('1 aviso encontrado')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamento pendente')).toBeInTheDocument();
    expect(within(dialog).getByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(within(dialog).getByText('Médico: Dra. Ana')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimento: Consulta')).toBeInTheDocument();
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

  it('alterna tema claro e escuro', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(screen.getByRole('button', { name: /^opções$/i }));
    expect(await screen.findByRole('heading', { name: 'Opções', level: 1 })).toBeInTheDocument();

    await user.click(screen.getByTitle('Usar tema claro'));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(screen.getByTitle('Usar tema escuro')).toBeInTheDocument();
  });
});
