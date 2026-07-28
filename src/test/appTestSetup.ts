import { vi } from 'vitest';
import * as api from '../services';
import { queryClient } from '../queryClient';
import { basePaciente, baseUser, buildMedicalLicense, paged } from './appTestData';

export function createJwtToken(payload: Record<string, unknown>) {
  const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.signature`;
}

export function setupAppTest() {
  localStorage.clear();
  queryClient.clear();
  window.history.pushState({}, '', '/');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  vi.clearAllMocks();
  vi.mocked(api.listPublicClinics).mockResolvedValue([
    { id: 1, nome: 'Hemodinks', slug: 'hemodinks', fotoUrl: null },
  ]);
  vi.mocked(api.listPlatformClinics).mockResolvedValue([]);
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
      {
        id: 1,
        nome: 'Ana Hemodinks',
        email: 'ana@hemodinks.com',
        perfilId: 1,
        perfilNome: 'Administrador',
      },
      {
        id: 2,
        nome: 'Bruno Hemodinks',
        email: 'bruno@hemodinks.com',
        perfilId: 4,
        perfilNome: 'Controller',
      },
    ],
    groups: [{ id: 1, nome: 'Grupo A', membrosCount: 2 }],
  });
  vi.mocked(api.markAgendaNotificationsAsRead).mockResolvedValue({
    updatedCount: 0,
  });
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
  vi.mocked(api.getPacienteFinanceiroResumo).mockResolvedValue({
    valorApresentado: 0,
    valorGlosado: 0,
    valorReconhecido: 0,
    valorRecebido: 0,
    saldoAberto: 0,
    statusFinanceiro: 'Sem movimentação',
    origemDados: 'Normalizado',
    avisos: [],
  });
  vi.mocked(api.getPacienteObservacoes).mockResolvedValue([]);
  vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));
  vi.mocked(api.createPacienteObservacao).mockResolvedValue({
    pacienteId: basePaciente.id,
    createdCount: 1,
  });
  vi.mocked(api.markPacienteObservacoesAsRead).mockResolvedValue({
    pacienteId: basePaciente.id,
    updatedCount: 0,
  });
  vi.mocked(api.getCbhpmGeral).mockResolvedValue(paged([]));
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:hemodinks-avatar'),
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  });
}
