import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as services from './services';
import { usePasswordResetConfirmation } from './features/auth/usePasswordResetConfirmation';
import { useBillingCbhpmGateway } from './features/billing/useBillingCbhpmGateway';
import { useClinicsGateway } from './features/clinics/useClinicsGateway';
import { useAgendaGateway } from './features/events/useAgendaGateway';
import { usePatientDocuments } from './features/patients/usePatientDocuments';
import { useUserDocuments } from './features/users/useUserDocuments';

vi.mock('./services', () => ({
  confirmPasswordReset: vi.fn(),
  getCbhpmGeral: vi.fn(),
  createPlatformClinic: vi.fn(),
  deactivatePlatformClinic: vi.fn(),
  listPlatformClinics: vi.fn(),
  selectSessionClinic: vi.fn(),
  updatePlatformClinic: vi.fn(),
  completeAgendaEvent: vi.fn(),
  createAgendaEvent: vi.fn(),
  deleteAgendaEvent: vi.fn(),
  getAgendaEvents: vi.fn(),
  getAgendaMedicalUsers: vi.fn(),
  getAgendaNotificationRecipientOptions: vi.fn(),
  getBrazilPublicHolidays: vi.fn(),
  updateAgendaEvent: vi.fn(),
  downloadPacienteArquivo: vi.fn(),
  getPacienteFinanceiroResumo: vi.fn(),
  downloadUserArquivo: vi.fn(),
}));

describe('feature gateways', () => {
  beforeEach(() => vi.clearAllMocks());

  it('encapsula token e parâmetros das integrações de feature', () => {
    const token = 'token';
    usePasswordResetConfirmation().confirm('reset', 'Senha');
    useBillingCbhpmGateway(token).search({ page: 2 } as never);
    const clinics = useClinicsGateway(token);
    clinics.list();
    clinics.create({ nome: 'Clínica' } as never);
    clinics.update(3, { nome: 'Nova' } as never);
    clinics.deactivate(3);
    clinics.select(3);
    const agenda = useAgendaGateway(token);
    agenda.list('2026-07-01', '2026-07-31');
    agenda.listMedicalUsers();
    agenda.listNotificationRecipients();
    agenda.create({ titulo: 'Consulta' } as never);
    agenda.update(4, { titulo: 'Retorno' } as never);
    agenda.complete(4);
    agenda.delete(4);
    const patient = usePatientDocuments(token);
    patient.download(5, 6);
    patient.getFinancialSummary(5);
    useUserDocuments(token).download(7, 8);

    expect(services.confirmPasswordReset).toHaveBeenCalledWith('reset', 'Senha');
    expect(services.getCbhpmGeral).toHaveBeenCalledWith(token, { page: 2 });
    expect(services.listPlatformClinics).toHaveBeenCalledWith(token);
    expect(services.updatePlatformClinic).toHaveBeenCalledWith(3, { nome: 'Nova' }, token);
    expect(services.getAgendaEvents).toHaveBeenCalledWith(token, '2026-07-01', '2026-07-31');
    expect(services.completeAgendaEvent).toHaveBeenCalledWith(4, token);
    expect(services.downloadPacienteArquivo).toHaveBeenCalledWith(5, 6, token);
    expect(services.getPacienteFinanceiroResumo).toHaveBeenCalledWith(5, token);
    expect(services.downloadUserArquivo).toHaveBeenCalledWith(7, 8, token);
  });
});
