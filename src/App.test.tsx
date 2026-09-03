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
import { CONSENT_POLICY_VERSION, CONSENT_STORAGE_KEY, saveConsent } from './shared/privacy/consentStorage';

vi.mock('./services', () => ({
  AUTH_EXPIRED_EVENT: 'hemodinks:auth-expired',
  DEFAULT_SYSTEM_SETTINGS: {
    id: 1,
    nomeEmpresa: 'Hemodinks',
    fotoEmpresa: null,
    dataCadastro: '',
    dataAtualizacao: null,
  },
  authenticate: vi.fn(),
  listPublicClinics: vi.fn(),
  listPlatformClinics: vi.fn(),
  createPlatformClinic: vi.fn(),
  updatePlatformClinic: vi.fn(),
  deactivatePlatformClinic: vi.fn(),
  listSessionClinics: vi.fn(),
  selectSessionClinic: vi.fn(),
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
  getCurrentLicenca: vi.fn(),
  getSystemSettings: vi.fn(),
  getSystemSettingsCompanyPhoto: vi.fn(),
  getAllCbhpmGeral: vi.fn(),
  getCbhpmGeral: vi.fn(),
  getConvenios: vi.fn(),
  getHospitais: vi.fn(),
  getMedicalGroup: vi.fn(),
  getMedicalGroups: vi.fn(),
  getMonitoringErrors: vi.fn(),
  clearMonitoringErrors: vi.fn(),
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
  downloadPacienteArquivo: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  downloadUserArquivo: vi.fn(),
  changePassword: vi.fn(),
  confirmPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getCurrentLegalAcceptance: vi.fn(),
  acceptCurrentLegalDocuments: vi.fn(),
  getCurrentPrivacyPreference: vi.fn(),
  updateCurrentPrivacyPreference: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

const currentLegalAcceptance = {
  requiresAcceptance: false,
  termsOfUse: {
    documentType: 'TermsOfUse' as const,
    currentVersion: '1.1',
    acceptedVersion: '1.1',
    acceptedAtUtc: '2026-09-03T15:30:00Z',
    isCurrent: true,
  },
  privacyNotice: {
    documentType: 'PrivacyNoticeAcknowledgement' as const,
    currentVersion: '1.1',
    acceptedVersion: '1.1',
    acceptedAtUtc: '2026-09-03T15:30:00Z',
    isCurrent: true,
  },
};

const pendingLegalAcceptance = {
  ...currentLegalAcceptance,
  requiresAcceptance: true,
  termsOfUse: {
    ...currentLegalAcceptance.termsOfUse,
    acceptedVersion: null,
    acceptedAtUtc: null,
    isCurrent: false,
  },
};

const currentPrivacyPreference = {
  hasPreference: true,
  currentDocumentVersion: '1.1',
  documentVersion: '1.1',
  preferencesEnabled: true,
  analyticsEnabled: false,
  acceptedAtUtc: '2026-09-03T15:30:00Z',
  updatedAtUtc: '2026-09-03T15:30:00Z',
};

function createJwtToken(payload: Record<string, unknown>) {
  const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.signature`;
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    saveConsent({ preferences: true, analytics: false });
    sessionStorage.clear();
    queryClient.clear();
    window.history.pushState({}, '', '/');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    vi.clearAllMocks();
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      { id: 1, nome: 'Hemodinks', slug: 'hemodinks', fotoUrl: null },
    ]);
    vi.mocked(api.listPlatformClinics).mockResolvedValue([]);
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue(currentLegalAcceptance);
    vi.mocked(api.acceptCurrentLegalDocuments).mockResolvedValue(currentLegalAcceptance);
    vi.mocked(api.getCurrentPrivacyPreference).mockResolvedValue(currentPrivacyPreference);
    vi.mocked(api.updateCurrentPrivacyPreference).mockResolvedValue(currentPrivacyPreference);
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
    vi.mocked(api.getCurrentLicenca).mockResolvedValue(buildMedicalLicense());
    vi.mocked(api.getSystemSettings).mockResolvedValue({
      id: 1,
      nomeEmpresa: 'Hemodinks',
      fotoEmpresa: null,
      dataCadastro: '2026-06-22T00:00:00Z',
      dataAtualizacao: null,
    });
    vi.mocked(api.getMonitoringErrors).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0,
    });
    vi.mocked(api.clearMonitoringErrors).mockResolvedValue({
      clearedAt: '2026-08-25T22:00:00Z',
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
      allRecipientsLabel: 'Todos os usuários ativos, exceto pacientes',
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
    vi.mocked(api.getCbhpmGeral).mockResolvedValue(paged([]));
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

    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'SenhaAlterada@123', 'hemodinks');
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.getByText('Administrador | gmarcone@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Painel informativo')).toBeInTheDocument();
    expect(screen.getByText('Resumo geral')).toBeInTheDocument();
    expect(screen.getByText('Usuários ativos')).toBeInTheDocument();
    expect(screen.getByText('Pacientes ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendencias')).toBeInTheDocument();
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });
    });

    await user.click(screen.getByRole('button', { name: /abrir usuários/i }));
    expect(window.location.pathname).toBe('/usuarios');

    const userRow = (await screen.findByText('Ana Hemodinks', {}, { timeout: 5_000 })).closest('tr')!;
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

    const storedSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}') as AuthSession;
    expect(storedSession.token).toBe('jwt-token');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  }, 15_000);

  it('sempre inicia no login mesmo com uma sessao salva anteriormente', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(mockSession()));

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Hemodinks' })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('exibe links legais no login e permite rejeitar opcionais sem bloquear o acesso', async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    render(<App />);

    const loginFooter = screen.getByRole('contentinfo', { name: 'Links legais' });
    expect(loginFooter.querySelector('a[href="/termos-de-uso"]')).toHaveTextContent('Termos de Uso');
    expect(loginFooter.querySelector('a[href="/politica-de-privacidade"]')).toHaveTextContent('Política de Privacidade');
    expect(screen.getByRole('heading', { name: 'Sua privacidade no HemoDinks' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Rejeitar opcionais' }));
    expect(screen.queryByRole('heading', { name: 'Sua privacidade no HemoDinks' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      necessary: true,
      version: CONSENT_POLICY_VERSION,
      preferences: false,
      analytics: false,
    });
    expect(screen.getByRole('button', { name: 'Configurar cookies' })).toBeVisible();
  });

  it('abre e fecha as preferências por teclado com opcionais desmarcados no primeiro acesso', async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    const user = userEvent.setup();
    render(<App />);
    const configureButton = screen.getByRole('button', { name: 'Configurar' });

    await user.click(configureButton);
    const dialog = screen.getByRole('dialog', { name: 'Configurar cookies e armazenamentos' });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveAccessibleDescription('Escolha quais recursos opcionais podem ser utilizados neste navegador. Os recursos necessários permanecem ativos para autenticação, segurança e funcionamento da plataforma. Você pode alterar essas opções a qualquer momento.');
    expect(screen.getByRole('link', { name: 'Saiba mais no Aviso de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade');
    expect(screen.getByText('Sempre ativos')).toHaveAccessibleName('Cookies necessários sempre ativos');
    expect(screen.getByRole('checkbox', { name: /Preferências/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Análise/ })).not.toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Aceitar opcionais' })).toBeVisible();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Configurar cookies e armazenamentos' })).not.toBeInTheDocument();
    await waitFor(() => expect(configureButton).toHaveFocus());
  });

  it('salva uma configuração personalizada e a mantém em nova renderização', async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Configurar' }));
    await user.click(screen.getByRole('checkbox', { name: /Preferências/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));

    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      necessary: true,
      version: CONSENT_POLICY_VERSION,
      preferences: true,
      analytics: false,
    });
    firstRender.unmount();
    render(<App />);
    expect(screen.queryByRole('heading', { name: 'Sua privacidade no HemoDinks' })).not.toBeInTheDocument();
  });

  it('solicita nova decisão quando a versão armazenada está desatualizada', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      necessary: true,
      version: '1.0',
      updatedAt: '2026-09-02T12:00:00.000Z',
      preferences: true,
      analytics: true,
    }));

    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sua privacidade no HemoDinks' })).toBeVisible();
  });

  it('usa o backend vigente como fonte de verdade após o login e atualiza a cópia local', async () => {
    vi.mocked(api.getCurrentPrivacyPreference).mockResolvedValue({
      ...currentPrivacyPreference,
      preferencesEnabled: false,
      analyticsEnabled: false,
      updatedAtUtc: '2026-09-03T16:00:00Z',
    });

    await renderAuthenticatedApp();

    await waitFor(() => expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      necessary: true,
      version: '1.1',
      preferences: false,
      analytics: false,
      updatedAt: '2026-09-03T16:00:00Z',
    }));
    expect(api.updateCurrentPrivacyPreference).not.toHaveBeenCalled();
  });

  it('envia a escolha local vigente quando o usuário ainda não possui preferência no backend', async () => {
    vi.mocked(api.getCurrentPrivacyPreference).mockResolvedValue({
      ...currentPrivacyPreference,
      hasPreference: false,
      documentVersion: null,
      acceptedAtUtc: null,
      updatedAtUtc: null,
      preferencesEnabled: false,
      analyticsEnabled: false,
    });
    saveConsent({ preferences: true, analytics: false });

    await renderAuthenticatedApp();

    await waitFor(() => expect(api.updateCurrentPrivacyPreference).toHaveBeenCalledWith(
      'jwt-token',
      '1.1',
      true,
      false,
    ));
  });

  it('salva no backend uma alteração feita no modal durante a sessão autenticada', async () => {
    const { user } = await renderAuthenticatedApp();
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    await waitFor(() => expect(api.getCurrentPrivacyPreference).toHaveBeenCalledWith('jwt-token'));

    await user.click(screen.getByRole('button', { name: 'Configurar cookies' }));
    await user.click(screen.getByRole('checkbox', { name: /Preferências/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));

    await waitFor(() => expect(api.updateCurrentPrivacyPreference).toHaveBeenCalledWith(
      'jwt-token',
      '1.1',
      false,
      false,
    ));
  });

  it.each([
    ['/termos-de-uso', 'Termos de Uso', 'Versão: 1.1'],
    ['/politica-de-privacidade', 'Aviso de Privacidade do HemoDinks', 'Versão: 1.1'],
  ])('abre a rota pública %s sem carregar dados da aplicação', async (path, title, version) => {
    window.history.pushState({}, '', path);
    render(<App />);

    expect(screen.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    expect(screen.getByText(/Última atualização:/).closest('p')).toHaveTextContent(version);
    expect(api.listPublicClinics).not.toHaveBeenCalled();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox', { name: /Li e estou ciente/ })).not.toBeInTheDocument();
  });

  it.each([
    '/termos-de-uso',
    '/politica-de-privacidade',
  ])('permite concluir o aceite pendente dentro da página jurídica %s', async (path) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(mockSession()));
    window.history.pushState({}, '', path);
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue(pendingLegalAcceptance);
    const user = userEvent.setup();

    render(<App />);

    const checkbox = await screen.findByRole('checkbox', { name: /Li e estou ciente/ });
    const submit = screen.getByRole('button', { name: 'Aceitar e continuar' });
    expect(submit).toBeDisabled();

    await user.click(checkbox);
    await user.click(submit);

    expect(api.acceptCurrentLegalDocuments).toHaveBeenCalledWith('jwt-token', '1.1', '1.1');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('renderiza o conteúdo completo dos Termos 1.1 com links internos para privacidade', () => {
    window.history.pushState({}, '', '/termos-de-uso');
    render(<App />);

    expect(screen.getByRole('heading', { name: '1. Uso do sistema' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '11. Dúvidas e suporte' })).toBeVisible();
    expect(screen.getByText(/A plataforma não substitui avaliações/)).toBeVisible();
    const privacyLinks = screen.getAllByRole('link', { name: /Aviso de Privacidade/ });
    expect(privacyLinks.length).toBeGreaterThanOrEqual(2);
    expect(privacyLinks.every((link) => link.getAttribute('href') === '/politica-de-privacidade')).toBe(true);
  });

  it('bloqueia os módulos até o usuário aceitar os documentos jurídicos vigentes', async () => {
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue(pendingLegalAcceptance);
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Documentos jurídicos atualizados' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ler os Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso');
    expect(screen.getByRole('link', { name: 'Ler o Aviso de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade');
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', {
      name: 'Li e estou ciente dos Termos de Uso e do Aviso de Privacidade do HemoDinks.',
    }));
    await user.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));

    expect(api.acceptCurrentLegalDocuments).toHaveBeenCalledWith('jwt-token', '1.1', '1.1');
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  });

  it('não exibe o bloqueio quando a versão vigente já foi aceita', async () => {
    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Documentos jurídicos atualizados' })).not.toBeInTheDocument();
    expect(api.acceptCurrentLegalDocuments).not.toHaveBeenCalled();
  });

  it('exige novo aceite quando a versão registrada está desatualizada', async () => {
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue({
      ...pendingLegalAcceptance,
      termsOfUse: {
        ...pendingLegalAcceptance.termsOfUse,
        acceptedVersion: '1.0',
        acceptedAtUtc: '2026-09-02T12:00:00Z',
      },
    });

    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Documentos jurídicos atualizados' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Painel inicial' })).not.toBeInTheDocument();
  });

  it('mantém o aceite persistido pelo servidor após logout e novo login', async () => {
    vi.mocked(api.getCurrentLegalAcceptance)
      .mockResolvedValueOnce(pendingLegalAcceptance)
      .mockResolvedValue(currentLegalAcceptance);
    const { user } = await renderAuthenticatedApp();
    await user.click(await screen.findByRole('checkbox', { name: /Li e estou ciente/ }));
    await user.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /sair/i }));
    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), mockSession().user.email);
    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    expect(api.getCurrentLegalAcceptance).toHaveBeenCalledTimes(2);
    expect(api.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1);
  });

  it('exibe o loading de inicializacao no login enquanto carrega as clinicas', async () => {
    let resolveClinics!: (clinics: Awaited<ReturnType<typeof api.listPublicClinics>>) => void;
    vi.mocked(api.listPublicClinics).mockReturnValue(new Promise((resolve) => {
      resolveClinics = resolve;
    }));

    render(<App />);

    const loadingStatus = screen.getByRole('status');
    expect(loadingStatus).toHaveTextContent('Iniciando o sistema');
    expect(loadingStatus).toHaveTextContent('Preparando seu acesso');
    expect(loadingStatus).toHaveTextContent('Bem-vindo ao Hemodinks!');
    expect(loadingStatus).toHaveTextContent('Estamos iniciando os serviços e carregando as informações da sua clínica.');
    expect(loadingStatus).toHaveTextContent('Conectando com segurança…');
    expect(loadingStatus).toHaveTextContent('Na primeira conexão, isso pode levar até 1 minuto. Você será direcionado automaticamente.');
    expect(loadingStatus.parentElement).toHaveClass('login-initial-loading');

    resolveClinics([{ id: 1, nome: 'Hemodinks', slug: 'hemodinks', fotoUrl: null }]);

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Hemodinks' })).toBeInTheDocument();
  });

  it('restaura a sessao salva na aba ao recarregar a aplicacao', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(mockSession()));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(api.authenticate).not.toHaveBeenCalled();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
  });

  it('exige e envia a clinica escolhida no login pesquisavel', async () => {
    const user = userEvent.setup();
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      { id: 1, nome: 'Clinica Alfa', slug: 'clinica-alfa', fotoUrl: null },
      { id: 2, nome: 'Clinica Beta', slug: 'clinica-beta', fotoUrl: null },
    ]);
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 2,
      clinicaId: 2,
      clinicaSlug: 'clinica-beta',
      nome: 'George Beta',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });

    render(<App />);
    const clinicInput = await screen.findByLabelText('Clínica');
    await user.selectOptions(clinicInput, '2');
    expect(clinicInput).toHaveValue('2');
    expect(screen.queryByText('clinica-beta')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'test-password');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'test-password', 'clinica-beta');
  });

  it('libera menu administrativo completo e CRUD de clinicas para superadministrador', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: { perfilId: 5, perfilNome: 'SuperAdministrador' },
    });
    vi.mocked(api.listPlatformClinics).mockResolvedValue([]);

    const sidebar = await screen.findByLabelText('Sessão ativa');
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
    expect(navigationButtons.at(-1)).toHaveTextContent('Opções');
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
    const row = (await screen.findAllByText('George Marcone'))
      .map((element) => element.closest('tr'))
      .find((element): element is HTMLTableRowElement => element !== null)!;
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

    const sidebar = await screen.findByLabelText('Sessão ativa');
    expect(within(sidebar).getByRole('button', { name: /pacientes/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /usuários/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^faturamento/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /agenda e notificações/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^clínicas$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir agenda/i })).toBeInTheDocument();
  });

  it('encerra a sessao quando a API sinaliza token expirado', async () => {
    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    fireEvent(window, new Event(api.AUTH_EXPIRED_EVENT));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    });
    expect(screen.getByText('Sua sessao expirou. Entre novamente para continuar.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Painel inicial' })).not.toBeInTheDocument();
  });

  it('nao mantem uma sessao criada com token JWT expirado', async () => {
    const user = userEvent.setup();
    const expiredToken = createJwtToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: expiredToken,
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });

    render(<App />);

    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    });
    expect(screen.getByText('Sua sessao expirou. Entre novamente para continuar.')).toBeInTheDocument();
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
    expect(await screen.findByText('1 cadastrados')).toBeInTheDocument();
    expect(screen.queryByText(/request failed with status code 403/i)).not.toBeInTheDocument();
  });

  it('usa a foto publica da clinica selecionada na tela de login', async () => {
    const user = userEvent.setup();
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      { id: 1, nome: 'Clinica Alfa', slug: 'clinica-alfa', fotoUrl: '/api/public/clinicas/clinica-alfa/foto' },
    ]);

    render(<App />);

    expect(screen.queryByAltText('Clinica Alfa')).not.toBeInTheDocument();
    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await waitFor(() => {
      expect(screen.getByAltText('Clinica Alfa')).toHaveAttribute('src', 'http://localhost:5000/api/public/clinicas/clinica-alfa/foto');
    });
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
    await user.click(within(screen.getByLabelText('Sessão ativa')).getByRole('button', { name: /agenda e notificações/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeInTheDocument();
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
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('hemodinks.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: /abrir opções/i }));
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
    await user.click(screen.getByRole('button', { name: /abrir opções/i }));
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

    await user.click(await screen.findByRole('button', { name: /abrir opções/i }));
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
    expect(screen.queryByRole('button', { name: /abrir opções/i })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /avisos/i }));

    expect(api.getDashboardNotifications).toHaveBeenCalledWith('jwt-token');

    const dialog = await screen.findByRole('dialog', { name: 'Notificações' });
    expect(within(dialog).getByText('1 aviso encontrado')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamento pendente')).toBeInTheDocument();
    expect(within(dialog).getByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(within(dialog).getByText('Médico: Dra. Ana')).toBeInTheDocument();
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
    const observationButton = within(patientRow.closest('tr')!).getByRole('button', { name: /observações de paciente hemodinks/i });
    expect(within(observationButton).getByText('3')).toBeInTheDocument();
    expect(observationButton).toHaveClass('has-unread-observations');

    await user.click(observationButton);

    const dialog = await screen.findByRole('dialog', { name: 'Paciente Hemodinks' });
    expect(within(dialog).getByText('3 observações não lidas')).toBeInTheDocument();
    expect(within(dialog).getByText('Não lida')).toBeInTheDocument();
    expect(within(dialog).getByText('Lida')).toBeInTheDocument();
  });

  it('exibe hospital e destaque visual no popup de informacoes do paciente', async () => {
    vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    const row = await screen.findByText('Paciente Hemodinks');

    await user.click(within(row.closest('tr')!).getByRole('button', { name: /informações adicionais de paciente hemodinks/i }));

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

    await user.type(passwordInput, 'test-password');
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

  it('carrega diretamente a foto publica da clinica', async () => {
    const user = userEvent.setup();
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      { id: 1, nome: 'Clinica Alfa', slug: 'clinica-alfa', fotoUrl: '/api/public/clinicas/clinica-alfa/foto' },
    ]);

    render(<App />);

    expect(screen.queryByAltText('Clinica Alfa')).not.toBeInTheDocument();
    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    const brandMark = await screen.findByAltText('Clinica Alfa');
    await waitFor(() => {
      expect(brandMark).toHaveAttribute('src', 'http://localhost:5000/api/public/clinicas/clinica-alfa/foto');
      expect(api.getSystemSettingsCompanyPhoto).not.toHaveBeenCalled();
    });
  });

  it('não revela nem preenche a credencial temporária após o reset de contingência', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: true,
      message: 'Nao foi possivel enviar o email de redefinicao agora. A senha padrao foi aplicada para voce entrar e trocar a seguir.',
      mode: 'default-password',
    });
    render(<App />);

    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com', 'hemodinks');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByText(/credencial temporária fornecida pela clínica/i)).toBeInTheDocument();
    expect(api.authenticate).not.toHaveBeenCalled();
  });

  it('mostra a instrucao de email quando o backend confirma o envio', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      message: 'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
      mode: 'email-token',
    });

    render(<App />);

    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com', 'hemodinks');
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

    await user.type(screen.getByLabelText('Nova senha'), 'different-test-password');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'different-test-password');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(api.confirmPasswordReset).toHaveBeenCalledWith('token-123', 'different-test-password');
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

    await user.selectOptions(await screen.findByLabelText('Clínica'), '1');
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'temporary-test-password');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Troque sua senha' })).toBeInTheDocument();
    expect(api.getUsers).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Senha atual'), 'temporary-test-password');
    await user.type(screen.getByLabelText('Nova senha'), 'different-test-password');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'different-test-password');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(api.changePassword).toHaveBeenCalledWith(
      99,
      { senhaAtual: 'temporary-test-password', novaSenha: 'different-test-password' },
      'jwt-token',
    );
    expect(await screen.findByText('Senha alterada com sucesso')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir usuários/i }));

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
    await user.click(screen.getByRole('button', { name: /novo usuário/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Bruno Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'bruno@hemodinks.com');
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
    await user.type(screen.getByLabelText('Email'), 'clara@hemodinks.com');
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
        canConsult
        loading={false}
        error=""
        canSearch
        filterHint=""
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

  it('permite cadastrar procedimento manual sem codigo no modal CBHPM', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CbhpmLookupModal
        items={[]}
        filters={{
          codigo: '',
          procedimento: 'Procedimento sem codigo',
          porte: '',
        }}
        isAdmin={false}
        canConsult
        loading={false}
        error=""
        canSearch
        filterHint=""
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
    expect(onSelect).toHaveBeenCalledWith({
      id: 0,
      codigo: '',
      procedimento: 'Procedimento sem codigo',
      porte: null,
      valorReferencia: null,
    });
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
          canConsult
          loading={false}
          error=""
          canSearch
          filterHint=""
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
    const cbhpmProcedures = [
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
    ];
    vi.mocked(api.getCbhpmGeral).mockImplementation(async (_token, query) => {
      const codigo = query?.codigo ?? '';
      const procedimento = query?.procedimento?.toLocaleLowerCase('pt-BR') ?? '';
      const items = codigo.includes('1010201')
        ? [cbhpmProcedures[1]]
        : codigo.includes('1010101') || procedimento.includes('consulta')
          ? [cbhpmProcedures[0]]
          : cbhpmProcedures;

      return paged(items, query?.page ?? 1, query?.pageSize ?? 10);
    });
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
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));

    await user.type(screen.getByLabelText('Data da Solicitação'), '04062026');
    await user.type(screen.getByLabelText('Cirurgias Consolidadas'), '05062026');
    await user.type(screen.getByLabelText('Paciente'), 'Novo Paciente');
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Telefone')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Data de nascimento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Convênio'), 'Convenio Manual');
    await user.type(screen.getByLabelText('Hospital'), 'Hospital Manual');
    await user.type(screen.getByLabelText('Fornecedor OPME'), 'Fornecedor Manual');
    await user.type(screen.getByLabelText('Cirurgião'), 'Ana Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Ana Hemodinks' }));
    await user.type(screen.getByLabelText('Médico auxiliar 1'), 'Bruno Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Bruno Hemodinks' }));
    await user.type(screen.getByLabelText('Médico auxiliar 2'), 'Clara Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Clara Hemodinks' }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));
    const cbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const refreshProceduresButton = within(cbhpmDialog).getByRole('button', { name: /consultar procedimentos/i });
    await waitFor(() => {
      expect(refreshProceduresButton).toBeEnabled();
    });
    fireEvent.change(within(cbhpmDialog).getByLabelText('Procedimento'), { target: { value: 'Consulta' } });
    await user.click(refreshProceduresButton);
    await waitFor(() => {
      expect(api.getCbhpmGeral).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ procedimento: 'Consulta' }));
    });
    await waitFor(() => {
      expect(within(cbhpmDialog).queryByText('Carregando procedimentos...')).not.toBeInTheDocument();
    });
    expect(within(cbhpmDialog).getByText('10101012')).toBeInTheDocument();
    const firstProcedureRow = within(cbhpmDialog).getByText('10101012').closest('tr');
    expect(firstProcedureRow).not.toBeNull();
    await user.click(within(firstProcedureRow!).getByRole('button', { name: /^adicionar$/i }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));
    const secondCbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const secondCodigoField = within(secondCbhpmDialog).getByLabelText('Código');
    const refreshSecondProceduresButton = within(secondCbhpmDialog).getByRole('button', { name: /consultar procedimentos/i });
    await waitFor(() => {
      expect(refreshSecondProceduresButton).toBeEnabled();
    });
    fireEvent.change(secondCodigoField, { target: { value: '1010201' } });
    await user.click(refreshSecondProceduresButton);
    await waitFor(() => {
      expect(api.getCbhpmGeral).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ codigo: '1010201' }));
    });
    await waitFor(() => {
      expect(within(secondCbhpmDialog).queryByText('Carregando procedimentos...')).not.toBeInTheDocument();
    });
    expect(within(secondCbhpmDialog).getByText('10102019')).toBeInTheDocument();
    const secondProcedureRow = within(secondCbhpmDialog).getByText('10102019').closest('tr');
    expect(secondProcedureRow).not.toBeNull();
    await user.click(within(secondProcedureRow!).getByRole('button', { name: /^adicionar$/i }));
    expect(screen.getByLabelText('Valor estimado')).toHaveValue('R$\u00a0300,00');
    expect(screen.getByLabelText('Valor estimado')).toBeDisabled();
    expect(screen.getByLabelText('Valor recebido/pago')).toHaveValue('');
    expect(screen.getByLabelText('Glosa')).toHaveValue('R$ 300,00');
    expect(screen.getByLabelText('Glosa')).toBeDisabled();
    await user.click(screen.getByLabelText('Valor recebido/pago'));
    await user.keyboard('125,45');
    expect(screen.getByLabelText('Valor recebido/pago')).toHaveValue('R$ 125,45');
    expect(screen.getByLabelText('Glosa')).toHaveValue('R$ 174,55');
    const paymentDateField = screen.getByLabelText('Data do Pagamento');
    expect(paymentDateField).toBeDisabled();
    await user.click(screen.getByLabelText('Status Pago'));
    expect(paymentDateField).toBeEnabled();
    await user.type(paymentDateField, '05062026');
    expect(paymentDateField).toHaveValue('05/06/2026');
    await user.click(screen.getByLabelText('Status Pago'));
    expect(paymentDateField).toBeDisabled();
    expect(paymentDateField).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));

    expect(api.createPaciente).toHaveBeenCalledWith({
      data: '2026-06-04',
      dataAtendimento: '2026-06-05',
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
      pagamento: 'R$ 125,45',
      repasseGlosa: 'R$ 174,55',
      statusPago: false,
      dataPagamento: null,
      ativo: true,
    }, 'jwt-token');
    expect(await screen.findByText('Paciente cadastrado com senha temporária. Oriente a alteração no primeiro acesso.')).toBeInTheDocument();
  }, 15000);

  it('permite ao administrador filtrar pacientes por cirurgiao, convenio e procedimento', async () => {
    vi.mocked(api.getPacientes)
      .mockResolvedValueOnce(paged([basePaciente]))
      .mockResolvedValue(paged([{ ...basePaciente, nomePaciente: 'Paciente Filtrado' }]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cirurgião'), 'Ana Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Ana Hemodinks' }));
    await user.type(screen.getByLabelText('Convênio'), 'Particular');
    await user.click(screen.getByRole('option', { name: 'Particular' }));
    await user.type(screen.getByLabelText('Procedimento'), 'Consulta');
    await user.type(screen.getByLabelText('Cirurgias Consolidadas - inicial'), '01062026');
    await user.type(screen.getByLabelText('Cirurgias Consolidadas - final'), '30062026');
    await user.type(screen.getByLabelText('Data inicial da solicitação'), '01052026');
    await user.type(screen.getByLabelText('Data final da solicitação'), '31052026');

    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        medicoUserIds: '1',
        convenioIds: '7',
        procedimento: 'Consulta',
        dataInicio: '2026-06-01',
        dataFinal: '2026-06-30',
        dataSolicitacaoInicio: '2026-05-01',
        dataSolicitacaoFinal: '2026-05-31',
        sortBy: 'data',
        sortDirection: 'desc',
      });
    });
  });

  it('exibe e ordena pacientes pela data do atendimento', async () => {
    vi.mocked(api.getPacientes).mockResolvedValue(paged([{
      ...basePaciente,
      dataAtendimento: '2026-06-15T00:00:00Z',
    }]));
    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('15/06/2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^cirurgias consolidadas$/i }));

    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenLastCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        sortBy: 'dataAtendimento',
        sortDirection: 'asc',
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

  it('libera gestao de pacientes para medico com feature de gerenciamento', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Pacientes.Visualizar',
          'Pacientes.Gerenciar',
          'Cbhpm.Consultar',
        ]),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir usuários/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir meu cadastro/i })).toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Cirurgião')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Convênio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Procedimento')).not.toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });
    expect(api.getScopedMedicalUsers).toHaveBeenCalledWith('jwt-token');

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cirurgião')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico auxiliar 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico auxiliar 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar paciente/i })).toBeInTheDocument();
  });

  it('carrega a licenca atual do medico quando ela nao vem no login e libera pacientes', async () => {
    vi.mocked(api.getCurrentLicenca).mockResolvedValue(buildMedicalLicense([
      'Dashboard.Visualizar',
      'Pacientes.Visualizar',
      'Pacientes.Gerenciar',
      'Cbhpm.Consultar',
    ]));

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: null,
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.getCurrentLicenca).toHaveBeenCalledWith('jwt-token');
    });

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
  });

  it('libera cadastro, edicao, arquivos e foto para medico mesmo sem feature de gerenciamento', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense(),
      },
    });

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo paciente/i }));
    expect(await screen.findByRole('heading', { name: 'Novo paciente' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Convênio'), 'Convênio manual do médico');
    await user.type(screen.getByLabelText('Hospital'), 'Hospital manual do médico');
    expect(screen.getByLabelText('Convênio')).toHaveValue('Convênio manual do médico');
    expect(screen.getByLabelText('Hospital')).toHaveValue('Hospital manual do médico');
    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar paciente/i })).toBeInTheDocument();
    expect(screen.getByText('Selecionar arquivos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
  });

  it('exibe pacientes para medico mesmo sem feature explicita de pacientes na licenca', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Cbhpm.Consultar',
        ]),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir usuários/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir opções/i })).not.toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
  });

  it('trata medico como licenca full para consultar CBHPM e cadastrar procedimento manual', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Pacientes.Visualizar',
          'Pacientes.Gerenciar',
        ]),
      },
    });

    await openPatientsModule(user);
    await user.click(screen.getByRole('button', { name: /novo paciente/i }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));

    const cbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const consultButton = within(cbhpmDialog).getByRole('button', { name: /consultar procedimentos/i });

    expect(within(cbhpmDialog).queryByText(/sua licença não libera a consulta cbhpm/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(consultButton).toBeEnabled();
    });
    fireEvent.change(within(cbhpmDialog).getByLabelText('Procedimento'), {
      target: { value: 'Consulta' },
    });
    await user.click(consultButton);

    await waitFor(() => {
      expect(api.getCbhpmGeral).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ procedimento: 'Consulta' }));
    });

    fireEvent.change(within(cbhpmDialog).getByLabelText('Procedimento'), {
      target: { value: 'Procedimento manual com licença full' },
    });
    await user.click(within(cbhpmDialog).getByRole('button', { name: /cadastrar manualmente/i }));

    expect(await screen.findByText('Procedimento manual com licença full')).toBeInTheDocument();
  });

  it('preserva medico fora da lista escopada ao editar e salvar paciente', async () => {
    vi.mocked(api.getPaciente).mockResolvedValue({
      ...basePaciente,
      medicoUserId: 55,
      medico: 'Dr. Fora da Lista',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Bruno Hemodinks',
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: '',
    });
    vi.mocked(api.updatePaciente).mockResolvedValue({
      ...basePaciente,
      medicoUserId: 55,
      medico: 'Dr. Fora da Lista',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Bruno Hemodinks',
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: '',
    });

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Pacientes.Visualizar',
          'Pacientes.Gerenciar',
          'Cbhpm.Consultar',
        ]),
      },
    });

    await openPatientsModule(user);
    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cirurgião')).toHaveValue('Dr. Fora da Lista');
    expect(screen.getByLabelText('Status Pago')).toBeChecked();
    expect(screen.getByLabelText('Data do Pagamento')).toBeEnabled();
    expect(screen.getByLabelText('Data do Pagamento')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /salvar paciente/i }));

    await waitFor(() => {
      expect(api.updatePaciente).toHaveBeenCalledWith(10, expect.objectContaining({
        medicoUserId: 55,
        medico: 'Dr. Fora da Lista',
      }), 'jwt-token');
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

  it('permite equipe consultar seus usuarios e pacientes sem gerenciar usuarios ou grupos medicos', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 6,
        perfilNome: 'Equipe',
        nome: 'Equipe Cirúrgica',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    const sidebar = screen.getByLabelText('Sessão ativa');
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
    expect(api.getAgendaNotificationRecipientOptions).toHaveBeenCalledWith('jwt-token');
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
    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));

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
    expect(screen.queryByRole('heading', { name: 'Meu cadastro', level: 1 })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir meu cadastro/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(within(sidebar).getByRole('button', { name: /pacientes/i }));
    expect(await screen.findByRole('heading', { name: /pacientes/i })).toBeInTheDocument();

    await user.click(within(screen.getByLabelText('Sessão ativa')).getByRole('button', { name: /^meu cadastro$/i }));
    expect(await screen.findByRole('heading', { name: 'Meu cadastro', level: 1 })).toBeInTheDocument();
    await user.click(within(screen.getByLabelText('Sessão ativa')).getByRole('button', { name: /agenda e notificações/i }));
    expect(await screen.findByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /exportar planilha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir paciente hemodinks/i })).not.toBeInTheDocument();

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

  it('alterna tema claro e escuro', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    await user.click(screen.getByRole('button', { name: /abrir opções/i }));
    expect(await screen.findByRole('heading', { name: 'Opções', level: 1 })).toBeInTheDocument();

    await user.click(screen.getByTitle('Usar tema claro'));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(screen.getByTitle('Usar tema escuro')).toBeInTheDocument();
  });
});
