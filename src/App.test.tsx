import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildEmptyForm } from './features/events/AgendaPage';
import * as api from './services';
import { CbhpmLookupModal } from './features/patients/CbhpmLookupModal';
import { queryClient } from './queryClient';
import type { AuthSession, Paciente, PacienteObservacao, User } from './types';

vi.mock('./services', () => ({
  DEFAULT_SYSTEM_SETTINGS: {
    id: 1,
    nomeEmpresa: 'Hemodinks',
    fotoEmpresa: null,
    dataCadastro: '',
    dataAtualizacao: null,
  },
  authenticate: vi.fn(),
  completeAgendaEvent: vi.fn(),
  createAgendaEvent: vi.fn(),
  deleteAgendaEvent: vi.fn(),
  getAgendaEvents: vi.fn(),
  getAgendaMedicalUsers: vi.fn(),
  getAgendaNotificationRecipientOptions: vi.fn(),
  getBrazilPublicHolidays: vi.fn(),
  markAgendaNotificationsAsRead: vi.fn(),
  updateAgendaEvent: vi.fn(),
  getDashboardNotifications: vi.fn(),
  getDashboardSummary: vi.fn(),
  getSystemSettings: vi.fn(),
  getSystemSettingsCompanyPhoto: vi.fn(),
  getAllCbhpmGeral: vi.fn(),
  getCbhpmGeral: vi.fn(),
  getConvenios: vi.fn(),
  getHospitais: vi.fn(),
  getMedicalGroup: vi.fn(),
  getMedicalGroups: vi.fn(),
  getScopedMedicalUsers: vi.fn(),
  getOpmeFornecedores: vi.fn(),
  getUsers: vi.fn(),
  getUser: vi.fn(),
  getUserProfilePhoto: vi.fn(),
  getPaciente: vi.fn(),
  getPacienteObservacoes: vi.fn(),
  getPacientes: vi.fn(),
  createPacienteObservacao: vi.fn(),
  markPacienteObservacoesAsRead: vi.fn(),
  createUser: vi.fn(),
  createPaciente: vi.fn(),
  updatePaciente: vi.fn(),
  deletePaciente: vi.fn(),
  uploadPacienteArquivo: vi.fn(),
  deletePacienteArquivo: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  changePassword: vi.fn(),
  confirmPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

const SESSION_KEY = 'hemodinks.session';

const baseUser: User = {
  id: 1,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  telefone: '+5581999999999',
  cpf: '52998224725',
  crm: '12345',
  crmUf: 'PE',
  fotoPerfil: 'data:image/png;base64,ana',
  dataCadastro: '2026-06-01T00:00:00Z',
  dataNascimento: '1990-01-01T00:00:00Z',
  ativo: true,
  precisaTrocarSenha: false,
  perfilId: 2,
  perfilNome: 'Médicos',
};

const basePaciente: Paciente = {
  id: 10,
  userId: 20,
  data: '2026-06-01T00:00:00Z',
  nomePaciente: 'Paciente Hemodinks',
  diagnostico: 'Diagnostico inicial',
  tratamentoMedico: 'Tratamento inicial',
  hospitalId: 1,
  hospital: 'Santa Clara - Mater Dei',
  medicoUserId: 1,
  medico: 'Dra. Ana',
  convenioId: 7,
  convenio: 'Particular',
  cbhpmCodigo: '1.01.01.01-2',
  cbhpmPorte: '2B',
  procedimento: 'Consulta',
  procedimentos: [
    {
      cbhpmCodigo: '1.01.01.01-2',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      valorReferencia: null,
      ordem: 1,
    },
  ],
  autorizacao: 'AUT-1',
  pagamento: 'Pix',
  repasseGlosa: 'Sem glosa',
  statusPago: true,
  cpf: '11144477735',
  email: 'paciente@hemodinks.com',
  telefone: '+5581998888888',
  fotoPerfil: null,
  dataNascimento: '1992-05-10T00:00:00Z',
  ativo: true,
  arquivosCount: 0,
  arquivos: [],
};

function paged<T>(items: T[], page = 1, pageSize = 10, totalItems = items.length) {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

function getVisibleFirstColumnValues() {
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  return rows.map((row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '');
}

function mockSession(overrides?: Partial<AuthSession['user']>) {
  return {
    token: 'jwt-token',
    user: {
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
      ...overrides,
    },
  };
}

function toLoginResponse(session: AuthSession) {
  return {
    id: session.user.id,
    nome: session.user.nome,
    email: session.user.email,
    cpf: session.user.cpf ?? null,
    crm: session.user.crm ?? null,
    crmUf: session.user.crmUf ?? null,
    token: session.token,
    fotoPerfil: session.user.fotoPerfil ?? null,
    precisaTrocarSenha: session.user.precisaTrocarSenha,
    perfilId: session.user.perfilId,
    perfilNome: session.user.perfilNome,
  };
}

async function renderAuthenticatedApp(options?: {
  initialPath?: string;
  sessionOverrides?: Partial<AuthSession['user']>;
  password?: string;
}) {
  const user = userEvent.setup();
  const session = mockSession(options?.sessionOverrides);

  vi.mocked(api.authenticate).mockResolvedValue(toLoginResponse(session));

  if (options?.initialPath) {
    window.history.pushState({}, '', options.initialPath);
  }

  render(<App />);

  await user.type(screen.getByLabelText('Email'), session.user.email);
  await user.type(screen.getByLabelText('Senha'), options?.password ?? 'SenhaAlterada@123');
  await user.click(screen.getByRole('button', { name: /entrar/i }));

  return { user, session };
}

async function openUsersModule(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /abrir usuarios/i }));
  expect(window.location.pathname).toBe('/usuarios');
}

async function openPatientsModule(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /abrir pacientes/i }));
  expect(window.location.pathname).toBe('/pacientes');
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
    window.history.pushState({}, '', '/');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    vi.clearAllMocks();
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      usersCount: 1,
      activeUsersCount: 1,
      pacientesCount: 1,
      activePatientsCount: 1,
      pendingPaymentsCount: 0,
      patientFilesCount: 0,
      upcomingEventsCount: 0,
    });
    vi.mocked(api.getDashboardNotifications).mockResolvedValue([]);
    vi.mocked(api.getSystemSettings).mockResolvedValue({
      id: 1,
      nomeEmpresa: 'Hemodinks',
      fotoEmpresa: null,
      dataCadastro: '2026-06-22T00:00:00Z',
      dataAtualizacao: null,
    });
    vi.mocked(api.updateSystemSettings).mockResolvedValue({
      id: 1,
      nomeEmpresa: 'Clinica Alfa',
      fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
      dataCadastro: '2026-06-22T00:00:00Z',
      dataAtualizacao: '2026-06-22T12:00:00Z',
    });
    vi.mocked(api.getAgendaEvents).mockResolvedValue([]);
    vi.mocked(api.getAgendaMedicalUsers).mockResolvedValue([]);
    vi.mocked(api.getAgendaNotificationRecipientOptions).mockResolvedValue({
      canNotifyAllAllowedRecipients: true,
      allRecipientsLabel: 'Todos os usuarios ativos, exceto pacientes',
      users: [
        { id: 1, nome: 'Ana Hemodinks', email: 'ana@hemodinks.com', perfilId: 1, perfilNome: 'Administrador' },
        { id: 2, nome: 'Bruno Hemodinks', email: 'bruno@hemodinks.com', perfilId: 4, perfilNome: 'Controller' },
      ],
      groups: [
        { id: 1, nome: 'Grupo A', membrosCount: 2 },
      ],
    });
    vi.mocked(api.markAgendaNotificationsAsRead).mockResolvedValue({ updatedCount: 0 });
    vi.mocked(api.getBrazilPublicHolidays).mockResolvedValue([]);
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser]));
    vi.mocked(api.getMedicalGroups).mockResolvedValue(paged([]));
    vi.mocked(api.getScopedMedicalUsers).mockResolvedValue([
      { id: 1, nome: 'Ana Hemodinks', email: 'ana@hemodinks.com' },
      { id: 2, nome: 'Bruno Hemodinks', email: 'bruno@hemodinks.com' },
      { id: 3, nome: 'Clara Hemodinks', email: 'clara@hemodinks.com' },
    ]);
    vi.mocked(api.getMedicalGroup).mockResolvedValue({
      id: 1,
      nome: 'Grupo A',
      ativo: true,
      dataCadastro: '2026-06-01T00:00:00Z',
      dataAtualizacao: null,
      membrosCount: 2,
      membros: [
        { userId: 1, nome: 'Ana Hemodinks', email: 'ana@hemodinks.com' },
        { userId: 2, nome: 'Bruno Hemodinks', email: 'bruno@hemodinks.com' },
      ],
    });
    vi.mocked(api.getUser).mockResolvedValue(baseUser);
    vi.mocked(api.getUserProfilePhoto).mockResolvedValue(new Blob(['avatar'], { type: 'image/png' }));
    vi.mocked(api.getHospitais).mockResolvedValue([
      { id: 1, nome: 'Santa Clara - Mater Dei' },
      { id: 2, nome: 'Santa Genoveva - Mater Dei' },
      { id: 3, nome: 'UMC - Complexo Hospitalar' },
    ]);
    vi.mocked(api.getConvenios).mockResolvedValue([
      { idConvenio: 1, descricaoConvenio: 'Amil' },
      { idConvenio: 2, descricaoConvenio: 'Bradesco Saude' },
      { idConvenio: 7, descricaoConvenio: 'Particular' },
    ]);
    vi.mocked(api.getOpmeFornecedores).mockResolvedValue([
      { idFornecedor: 1, fornecedor: 'Promedom' },
      { idFornecedor: 2, fornecedor: 'AVL' },
      { idFornecedor: 3, fornecedor: 'GE' },
      { idFornecedor: 4, fornecedor: 'Spyner' },
    ]);
    vi.mocked(api.getPaciente).mockResolvedValue(basePaciente);
    vi.mocked(api.getPacienteObservacoes).mockResolvedValue([]);
    vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));
    vi.mocked(api.createPacienteObservacao).mockResolvedValue({ pacienteId: basePaciente.id, createdCount: 1 });
    vi.mocked(api.markPacienteObservacoesAsRead).mockResolvedValue({ pacienteId: basePaciente.id, updatedCount: 0 });
    vi.mocked(api.getAllCbhpmGeral).mockResolvedValue([]);
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:hemodinks-avatar'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
  });

  it('faz login, salva a sessao JWT e carrega usuarios', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      cpf: '00000000191',
      fotoPerfil: 'data:image/png;base64,george',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });
    vi.mocked(api.resetPassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: true,
      message: 'Senha resetada para a senha padrao',
    });

    render(<App />);

    expect(screen.getByText('GM Tech Solutions')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'SenhaAlterada@123');
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.getByText('Administrador | gmarcone@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Painel informativo')).toBeInTheDocument();
    expect(screen.getByText('Resumo geral')).toBeInTheDocument();
    expect(screen.getByText('Usuarios ativos')).toBeInTheDocument();
    expect(screen.getByText('Pacientes ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendencias')).toBeInTheDocument();
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
    expect(api.getPacientes).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /abrir usuarios/i }));
    expect(window.location.pathname).toBe('/usuarios');

    const userRow = (await screen.findByText('Ana Hemodinks')).closest('tr')!;
    expect(screen.getByAltText('Foto de Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de George Marcone')).toBeInTheDocument();
    expect(within(userRow).queryByText('+55 (81) 99999-9999')).not.toBeInTheDocument();
    expect(within(userRow).queryByText('529.982.247-25')).not.toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'recent', sortDirection: 'desc' });

    await user.click(within(userRow).getByLabelText('Contato de Ana Hemodinks'));

    const contactDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(within(contactDialog).getByText('ana@hemodinks.com')).toBeInTheDocument();
    expect(within(contactDialog).getByText('+55 (81) 99999-9999')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ana Hemodinks' })).not.toBeInTheDocument());

    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') as AuthSession;
    expect(storedSession.token).toBeUndefined();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('sempre inicia no login mesmo com uma sessao salva anteriormente', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(mockSession()));

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('usa a foto configurada da empresa na tela de login', async () => {
    vi.mocked(api.getSystemSettings).mockResolvedValue({
      id: 1,
      nomeEmpresa: 'Hemodinks',
      fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
      dataCadastro: '2026-06-22T00:00:00Z',
      dataAtualizacao: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByAltText('Hemodinks')).toHaveAttribute('src', 'data:image/png;base64,YnJhbmQ=');
    });
  });

  it('abre a agenda por URL direta', async () => {
    const { user } = await renderAuthenticatedApp({ initialPath: '/agenda' });

    expect(await screen.findByRole('heading', { name: 'Agenda e notificacoes' })).toBeInTheDocument();
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
    const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
    vi.mocked(api.getAgendaEvents).mockResolvedValue([
      {
        id: 101,
        userId: 1,
        userName: 'George Marcone',
        medicalUserId: null,
        medicalUserName: null,
        title: 'Evento A',
        description: 'Primeiro evento',
        start: `${todayKey}T12:00:00Z`,
        end: `${todayKey}T13:00:00Z`,
        notifyMedicalProfile: false,
        notifyUser: false,
        reminderPeriodMinutes: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        isCompleted: false,
        completedAt: null,
        createdAt: `${todayKey}T11:00:00Z`,
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
        start: `${todayKey}T15:00:00Z`,
        end: `${todayKey}T16:00:00Z`,
        notifyMedicalProfile: false,
        notifyUser: false,
        reminderPeriodMinutes: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        isCompleted: false,
        completedAt: null,
        createdAt: `${todayKey}T14:00:00Z`,
        updatedAt: null,
      },
    ]);

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Sessao ativa')).getByRole('button', { name: /agenda e notificacoes/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificacoes', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Evento A')).toBeInTheDocument();
    const eventCard = screen.getByText('Evento A').closest('article');
    expect(eventCard).not.toBeNull();

    await user.click(within(eventCard as HTMLElement).getByLabelText('Excluir'));

    const confirmDialog = await screen.findByRole('dialog', { name: 'Excluir evento?' });
    expect(within(confirmDialog).getByText(/Deseja excluir "Evento A"/i)).toBeInTheDocument();
    expect(api.deleteAgendaEvent).not.toHaveBeenCalled();

    await user.click(within(confirmDialog).getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(api.deleteAgendaEvent).toHaveBeenCalledWith(101, 'jwt-token'));
    expect(api.deleteAgendaEvent).not.toHaveBeenCalledWith(202, 'jwt-token');
  });

  it('alterna entre tema claro e escuro no painel logado', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-theme');

    await user.click(screen.getByRole('button', { name: /abrir configuracao do sistema/i }));
    expect(await screen.findByRole('heading', { name: 'Configuracao do sistema', level: 1 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /escuro/i }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('hemodinks.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: /claro/i }));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('hemodinks.theme')).toBe('light');
  });

  it('atualiza a marca da empresa nas configuracoes do sistema', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir configuracao do sistema/i }));
    expect(await screen.findByRole('heading', { name: 'Configuracao do sistema', level: 1 })).toBeInTheDocument();

    const companyInput = screen.getByLabelText('Nome exibido no sistema');
    await user.clear(companyInput);
    await user.type(companyInput, 'Clinica Alfa');
    await user.upload(
      screen.getByLabelText('Foto da empresa'),
      new File(['brand'], 'brand.png', { type: 'image/png' }),
    );

    await user.click(screen.getByRole('button', { name: /salvar marca/i }));

    await waitFor(() => expect(api.updateSystemSettings).toHaveBeenCalledWith({
      nomeEmpresa: 'Clinica Alfa',
      fotoEmpresa: 'data:image/png;base64,YnJhbmQ=',
    }, 'jwt-token'));
    expect(within(screen.getByRole('banner')).getByText('Clinica Alfa')).toBeInTheDocument();
    expect(screen.getByText('Marca da empresa atualizada.')).toBeInTheDocument();
    expect(screen.getByAltText('Clinica Alfa')).toHaveAttribute('src', 'data:image/png;base64,YnJhbmQ=');
  });

  it('oculta a alteracao do nome da empresa para perfil nao administrador', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: { perfilId: 2, perfilNome: 'Médicos' },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir configuracao do sistema/i }));
    expect(await screen.findByRole('heading', { name: 'Configuracao do sistema', level: 1 })).toBeInTheDocument();

    expect(screen.queryByText('Marca da empresa')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome exibido no sistema')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto da empresa')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /escuro/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alterar senha' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /avisos/i }));

    expect(api.getDashboardNotifications).toHaveBeenCalledWith('jwt-token');

    const dialog = await screen.findByRole('dialog', { name: 'Notificacoes' });
    expect(within(dialog).getByText('1 aviso encontrado')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamento pendente')).toBeInTheDocument();
    expect(within(dialog).getByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(within(dialog).getByText('Medico: Dra. Ana')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimento: Consulta')).toBeInTheDocument();
  });

  it('destaca observacoes nao lidas na lista de pacientes e no modal', async () => {
    const pacienteComNaoLidas: Paciente = {
      ...basePaciente,
      observacoesNaoLidasCount: 3,
    };
    const observacoes: PacienteObservacao[] = [
      {
        id: 1,
        pacienteId: basePaciente.id,
        texto: 'Primeira observacao sem leitura.',
        dataCadastro: '2026-06-01T10:00:00Z',
        autorUserId: 1,
        autorNome: 'Dra. Ana',
        autorPerfilId: 2,
        autorPerfilNome: 'Médicos',
        destinatarioUserId: 99,
        destinatarioNome: 'George Marcone',
        destinatarioPerfilId: 1,
        destinatarioPerfilNome: 'Administrador',
        nomePaciente: basePaciente.nomePaciente,
        foiLida: false,
        enviadaPorMim: false,
      },
      {
        id: 2,
        pacienteId: basePaciente.id,
        texto: 'Resposta ja lida.',
        dataCadastro: '2026-06-01T11:00:00Z',
        autorUserId: 99,
        autorNome: 'George Marcone',
        autorPerfilId: 1,
        autorPerfilNome: 'Administrador',
        destinatarioUserId: 1,
        destinatarioNome: 'Dra. Ana',
        destinatarioPerfilId: 2,
        destinatarioPerfilNome: 'Médicos',
        nomePaciente: basePaciente.nomePaciente,
        foiLida: true,
        enviadaPorMim: true,
      },
    ];

    vi.mocked(api.getPacientes).mockResolvedValue(paged([pacienteComNaoLidas]));
    vi.mocked(api.getPaciente).mockResolvedValue(pacienteComNaoLidas);
    vi.mocked(api.getPacienteObservacoes).mockResolvedValue(observacoes);
    vi.mocked(api.markPacienteObservacoesAsRead).mockResolvedValue({ pacienteId: basePaciente.id, updatedCount: 0 });

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir pacientes/i }));

    const patientRow = await screen.findByText('Paciente Hemodinks');
    const observationButton = within(patientRow.closest('tr')!).getByRole('button', { name: /observacoes de paciente hemodinks/i });
    expect(within(observationButton).getByText('3')).toBeInTheDocument();
    expect(observationButton).toHaveClass('has-unread-observations');

    await user.click(observationButton);

    const dialog = await screen.findByRole('dialog', { name: 'Paciente Hemodinks' });
    expect(within(dialog).getByText('3 observacoes nao lidas')).toBeInTheDocument();
    expect(within(dialog).getByText('Nao lida')).toBeInTheDocument();
    expect(within(dialog).getByText('Lida')).toBeInTheDocument();
  });

  it('exibe hospital e destaque visual no popup de informacoes do paciente', async () => {
    vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    const row = await screen.findByText('Paciente Hemodinks');

    await user.click(within(row.closest('tr')!).getByRole('button', { name: /informacoes adicionais de paciente hemodinks/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Paciente Hemodinks' });
    expect(within(dialog).getByText('Hospital')).toBeInTheDocument();
    expect(within(dialog).getByText('Santa Clara - Mater Dei')).toBeInTheDocument();
    expect(within(dialog).getByText('Convênio')).toBeInTheDocument();
    expect(within(dialog).getByText('Particular')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimentos')).toBeInTheDocument();
  });

  it('permite visualizar e ocultar a senha no login', async () => {
    const user = userEvent.setup();

    render(<App />);

    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.type(passwordInput, 'Senha@123');
    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar senha/i }));

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

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

  it('carrega a foto da empresa pela API quando a configuracao usa o storage', async () => {
    vi.mocked(api.getSystemSettings).mockResolvedValue({
      id: 1,
      nomeEmpresa: 'Clinica Alfa',
      fotoEmpresa: '/profile-photos/clinica-alfa.png',
      dataCadastro: '2026-06-22T00:00:00Z',
      dataAtualizacao: '2026-06-22T12:00:00Z',
    });
    vi.mocked(api.getSystemSettingsCompanyPhoto).mockResolvedValue(new Blob(['brand'], { type: 'image/png' }));

    render(<App />);

    const brandMark = await screen.findByAltText('Clinica Alfa');
    await waitFor(() => {
      expect(brandMark).toHaveAttribute('src', 'blob:hemodinks-avatar');
      expect(api.getSystemSettingsCompanyPhoto).toHaveBeenCalledTimes(1);
    });
  });

  it('reseta para a senha padrao e exige troca ao entrar', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: true,
      message: 'Nao foi possivel enviar o email de redefinicao agora. A senha padrao foi aplicada para voce entrar e trocar a seguir.',
      mode: 'default-password',
    });
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });

    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('Senha@123');

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'Senha@123');
    expect(await screen.findByRole('heading', { name: 'Troque sua senha' })).toBeInTheDocument();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('mostra a instrucao de email quando o backend confirma o envio', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      message: 'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
      mode: 'email-token',
    });

    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByText(
      'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
    )).toBeInTheDocument();
  });

  it('mostra a tela publica de nova senha quando o link de reset possui token', async () => {
    const user = userEvent.setup();
    window.history.pushState(null, '', '/reset-password?token=token-123');
    vi.mocked(api.confirmPasswordReset).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: false,
      message: 'Senha redefinida com sucesso',
    });

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha@123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(api.confirmPasswordReset).toHaveBeenCalledWith('token-123', 'NovaSenha@123');
    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(screen.getByText('Senha redefinida com sucesso. Entre com a nova senha.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('permite voltar da tela publica de redefinicao para o login', async () => {
    const user = userEvent.setup();
    window.history.pushState(null, '', '/reset-password?token=token-123');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar ao login/i }));

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('bloqueia o primeiro acesso ate a troca da senha padrao', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: true,
      perfilId: 1,
      perfilNome: 'Administrador',
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
    expect(screen.getByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir usuarios/i }));

    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /novo usuario/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Bruno Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'bruno@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81988888888');
    await user.type(screen.getByLabelText('Data de nascimento'), '10051992');
    expect(screen.getByLabelText('Perfil')).toHaveValue('2');
    await user.type(screen.getByLabelText('CRM'), '12345');
    await user.selectOptions(screen.getByLabelText('UF do CRM'), 'PE');
    await user.click(screen.getByRole('button', { name: /cadastrar usuario/i }));

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
    expect(await screen.findByText('Usuario cadastrado com senha inicial Senha@123.')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /novo usuario/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Clara Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'clara@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81997777777');
    await user.type(screen.getByLabelText('CRM'), '98765');
    await user.selectOptions(screen.getByLabelText('UF do CRM'), 'SP');
    await user.upload(
      screen.getByLabelText('Foto do perfil'),
      new File(['avatar'], 'avatar.png', { type: 'image/png' }),
    );

    expect(await screen.findByAltText('Foto de Clara Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cadastrar usuario/i }));

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

  it('ordena usuarios por registro recente e nome', async () => {
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
    expect(getVisibleFirstColumnValues()).toEqual(['Ana Recente', 'Bruno Recente', 'Carlos Antigo']);
  });

  it('permite cadastrar procedimento manual no modal CBHPM', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CbhpmLookupModal
        items={[]}
        filters={{
          codigo: '9.99.99.99-9',
          procedimento: 'Procedimento manual Hemodinks',
          porte: '1A',
        }}
        isAdmin={false}
        loading={false}
        error=""
        currentPage={1}
        totalPages={1}
        totalItems={0}
        visibleStart={0}
        visibleEnd={0}
        sortBy="codigo"
        sortDirection="asc"
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Nenhum procedimento encontrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cadastrar manualmente/i }));

    expect(onSelect).toHaveBeenCalledWith({
      id: 0,
      codigo: '99999999',
      procedimento: 'Procedimento manual Hemodinks',
      porte: '1A',
      valorReferencia: null,
    });
  });

  it('mantem cadastro manual desbloqueado para administrador no modal CBHPM', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CbhpmLookupModal
        items={[]}
        filters={{
          codigo: '',
          procedimento: '',
          porte: '',
        }}
        isAdmin
        loading={false}
        error=""
        currentPage={1}
        totalPages={1}
        totalItems={0}
        visibleStart={0}
        visibleEnd={0}
        sortBy="codigo"
        sortDirection="asc"
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    const manualButton = screen.getByRole('button', { name: /cadastrar manualmente/i });

    expect(manualButton).toBeEnabled();
    await user.click(manualButton);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Informe a descricao do procedimento para cadastrar manualmente.')).toBeInTheDocument();
  });

  it('mantem foco ao digitar nos filtros do modal CBHPM', async () => {
    const user = userEvent.setup();

    function ControlledCbhpmLookupModal() {
      const [filters, setFilters] = useState({
        codigo: '',
        procedimento: '',
        porte: '',
      });

      return (
        <CbhpmLookupModal
          items={[]}
          filters={filters}
          isAdmin
          loading={false}
          error=""
          currentPage={1}
          totalPages={1}
          totalItems={0}
          visibleStart={0}
          visibleEnd={0}
          sortBy="codigo"
          sortDirection="asc"
          onFiltersChange={setFilters}
          onPageChange={vi.fn()}
          onSortChange={vi.fn()}
          onRefresh={vi.fn()}
          onSelect={vi.fn()}
          onClose={() => vi.fn()}
        />
      );
    }

    render(<ControlledCbhpmLookupModal />);

    const procedimentoFilter = screen.getByLabelText('Procedimento');

    await user.click(procedimentoFilter);
    await user.keyboard('Consulta');

    expect(procedimentoFilter).toHaveValue('Consulta');
    expect(procedimentoFilter).toHaveFocus();
  });

  it('lista e cadastra pacientes', async () => {
    const auxiliar1: User = {
      ...baseUser,
      id: 2,
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      cpf: '11144477735',
    };
    const auxiliar2: User = {
      ...baseUser,
      id: 3,
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      cpf: '93541134780',
    };
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser, auxiliar1, auxiliar2]));
    vi.mocked(api.getAllCbhpmGeral).mockResolvedValue([
      {
        id: 1,
        codigo: '1.01.01.01-2',
        procedimento: 'Consulta',
        porte: '2B',
        valorReferencia: 120,
      },
      {
        id: 2,
        codigo: '1.01.02.01-9',
        procedimento: 'Visita hospitalar',
        porte: '2A',
        valorReferencia: 180,
      },
    ]);
    vi.mocked(api.createPaciente).mockResolvedValue({
      ...basePaciente,
      id: 11,
      nomePaciente: 'Novo Paciente',
      hospitalId: 2,
      hospital: 'Santa Genoveva - Mater Dei',
      email: 'paciente-tecnico@hemodinks.local',
      telefone: '',
      cpf: null,
      statusPago: false,
    });

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);

    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'recent', sortDirection: 'desc' });

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));

    await user.type(screen.getByLabelText('Data procedimento'), '04062026');
    await user.type(screen.getByLabelText('Paciente'), 'Novo Paciente');
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Telefone')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Data de nascimento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Convênio'), 'Convenio Manual');
    await user.type(screen.getByLabelText('Hospital'), 'Hospital Manual');
    await user.type(screen.getByLabelText('Fornecedor OPME'), 'Fornecedor Manual');
    await user.selectOptions(screen.getByLabelText('Cirurgião'), '1');
    await user.selectOptions(screen.getByLabelText('Médico auxiliar 1'), '2');
    await user.selectOptions(screen.getByLabelText('Médico auxiliar 2'), '3');
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));
    const cbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    fireEvent.change(within(cbhpmDialog).getByLabelText('Codigo'), { target: { value: '1010101' } });
    expect(await within(cbhpmDialog).findByText('10101012')).toBeInTheDocument();
    const firstProcedureRow = within(cbhpmDialog).getByText('10101012').closest('tr');
    expect(firstProcedureRow).not.toBeNull();
    await user.click(within(firstProcedureRow!).getByRole('button', { name: /^adicionar$/i }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));
    const secondCbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const secondCodigoField = within(secondCbhpmDialog).getByLabelText('Codigo');
    fireEvent.change(secondCodigoField, { target: { value: '1010201' } });
    expect(await within(secondCbhpmDialog).findByText('10102019')).toBeInTheDocument();
    const secondProcedureRow = within(secondCbhpmDialog).getByText('10102019').closest('tr');
    expect(secondProcedureRow).not.toBeNull();
    await user.click(within(secondProcedureRow!).getByRole('button', { name: /^adicionar$/i }));
    await user.type(screen.getByLabelText('Valor recebido/pago'), '200000');
    await user.type(screen.getByLabelText('Glosa'), '1250');
    expect(screen.getByLabelText('Valor recebido/pago')).toHaveValue('R$ 2.000,00');
    expect(screen.getByLabelText('Glosa')).toHaveValue('R$ 12,50');
    await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));

    expect(api.createPaciente).toHaveBeenCalledWith({
      data: '2026-06-04',
      nomePaciente: 'Novo Paciente',
      diagnostico: '',
      tratamentoMedico: '',
      cpf: '',
      email: '',
      telefone: '',
      fotoPerfil: null,
      dataNascimento: '1900-01-01',
      hospitalId: null,
      hospital: 'Hospital Manual',
      medicoUserId: 1,
      medico: 'Ana Hemodinks',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Bruno Hemodinks',
      medicoAuxiliar2UserId: 3,
      medicoAuxiliar2: 'Clara Hemodinks',
      convenioId: null,
      convenio: 'Convenio Manual',
      opmeFornecedorId: null,
      opmeFornecedor: 'Fornecedor Manual',
      cbhpmCodigo: '10101012',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      procedimentos: [
        {
          cbhpmCodigo: '10101012',
          cbhpmPorte: '2B',
          procedimento: 'Consulta',
          valorReferencia: 120,
        },
        {
          cbhpmCodigo: '10102019',
          cbhpmPorte: '2A',
          procedimento: 'Visita hospitalar',
          valorReferencia: 180,
        },
      ],
      autorizacao: '',
      pagamento: 'R$ 2.000,00',
      repasseGlosa: 'R$ 12,50',
      statusPago: false,
      ativo: true,
    }, 'jwt-token');
    expect(await screen.findByText('Paciente cadastrado com senha inicial Senha@123.')).toBeInTheDocument();
  });

  it('permite ao administrador filtrar pacientes por cirurgiao, convenio e procedimento', async () => {
    vi.mocked(api.getPacientes)
      .mockResolvedValueOnce(paged([basePaciente]))
      .mockResolvedValue(paged([{ ...basePaciente, nomePaciente: 'Paciente Filtrado' }]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cirurgiao'), 'Ana Hemodinks');
    await user.type(screen.getByLabelText('Convenio'), 'Particular');
    await user.type(screen.getByLabelText('Procedimento'), 'Consulta');

    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        medico: 'Ana Hemodinks',
        convenio: 'Particular',
        procedimento: 'Consulta',
        sortBy: 'recent',
        sortDirection: 'desc',
      });
    });
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

  it('libera pacientes para medico e exibe os combos de equipe medica', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir usuarios/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir meu cadastro/i })).toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Cirurgiao')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Convenio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Procedimento')).not.toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'recent', sortDirection: 'desc' });
    expect(api.getScopedMedicalUsers).toHaveBeenCalledWith('jwt-token');

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cirurgião')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico auxiliar 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico auxiliar 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar paciente/i })).toBeInTheDocument();
  });

  it('reativa o perfil paciente no cadastro de usuario', async () => {
    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    await user.click(screen.getByRole('button', { name: /novo usuario/i }));
    expect(await screen.findByRole('option', { name: 'Paciente' })).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/meu-cadastro');

    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
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
    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();

    const sidebar = screen.getByLabelText('Sessao ativa');
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

    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(within(sidebar).getByRole('button', { name: /pacientes/i }));
    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Sessao ativa')).getByRole('button', { name: /^meu cadastro$/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Sessao ativa')).getByRole('button', { name: /agenda e notificacoes/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificacoes', level: 1 })).toBeInTheDocument();
  });

  it('permite controller editar pacientes e restringe usuarios e agenda', async () => {
    await renderAuthenticatedApp({
      initialPath: '/dashboard',
      sessionOverrides: {
        perfilId: 4,
        perfilNome: 'Controller',
      },
    });

    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/pacientes');
    });
    expect(screen.queryByRole('button', { name: /abrir usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir agenda/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir painel/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar xlsx/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument();
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir paciente hemodinks/i })).not.toBeInTheDocument();
  });

  it('ordena pacientes por registro recente e nome', async () => {
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser]));
    vi.mocked(api.getPacientes).mockResolvedValue(paged([
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
    ]));

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

    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
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

    const confirmDialog = await screen.findByRole('dialog', { name: 'Excluir usuario?' });
    expect(within(confirmDialog).getByText(/Deseja excluir "Ana Hemodinks"/i)).toBeInTheDocument();
    expect(api.deleteUser).not.toHaveBeenCalled();

    await user.click(within(confirmDialog).getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(1, 'jwt-token'));
    expect(await screen.findByText('Usuario excluido.')).toBeInTheDocument();
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

    await user.click(screen.getByTitle('Proxima pagina'));

    expect(await screen.findByText('Usuario 11')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 1')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('11-12 de 12')).toBeInTheDocument();
    });
  });

  it('alterna tema claro e escuro', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir configuracao do sistema/i }));
    expect(await screen.findByRole('heading', { name: 'Configuracao do sistema', level: 1 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /escuro/i }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: /claro/i })).toBeInTheDocument();
  });
});
