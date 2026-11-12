import { configure } from '@testing-library/react';
import { vi } from 'vitest';
import { queryClient } from '../queryClient';
import * as api from '../services';
import { restoreSession } from '../services/sessionService';
import { saveConsent } from '../shared/privacy/consentStorage';
import { basePaciente, baseUser, buildMedicalLicense, paged } from './appTestData';

export const currentLegalAcceptance = {
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
    currentVersion: '1.2',
    acceptedVersion: '1.2',
    acceptedAtUtc: '2026-09-03T15:30:00Z',
    isCurrent: true,
  },
};

export const pendingLegalAcceptance = {
  ...currentLegalAcceptance,
  requiresAcceptance: true,
  termsOfUse: {
    ...currentLegalAcceptance.termsOfUse,
    acceptedVersion: null,
    acceptedAtUtc: null,
    isCurrent: false,
  },
};

export const currentPrivacyPreference = {
  hasPreference: true,
  currentDocumentVersion: '1.2',
  documentVersion: '1.2',
  preferencesEnabled: true,
  analyticsEnabled: false,
  acceptedAtUtc: '2026-09-03T15:30:00Z',
  updatedAtUtc: '2026-09-03T15:30:00Z',
};

export function createJwtToken(payload: Record<string, unknown>) {
  const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.signature`;
}

// Shared reset for App-level suites. Callers must mock './services' with
// createServicesMock() and './services/sessionService' (restoreSession) first.
export function resetAppTestState() {
  // Lazy route modules can take several seconds to load on cold CI workers.
  configure({ asyncUtilTimeout: 5_000 });
  localStorage.clear();
  saveConsent({ preferences: true, analytics: false });
  sessionStorage.clear();
  queryClient.clear();
  window.history.pushState({}, '', '/');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  vi.clearAllMocks();
  vi.mocked(restoreSession).mockResolvedValue(null);
  vi.mocked(api.resolveLoginClinics).mockResolvedValue({
    clinicas: [{ clinicaId: 1, nome: 'Hemodinks', slug: 'hemodinks' }],
  });
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
}
