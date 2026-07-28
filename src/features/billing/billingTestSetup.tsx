import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { ContaReceber, Faturamento } from './billingDomainTypes';
import { BillingPage } from './BillingPage';
import * as services from '../../services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

export const session = {
  token: 'token',
  user: {
    id: 1,
    clinicaId: 1,
    clinicaSlug: 'hemodinks',
    nome: 'Admin',
    email: 'admin@test.local',
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
  },
} as AuthSession;
export const atendimento = {
  id: 1,
  pacienteId: 1,
  paciente: 'Paciente Teste',
  dataProcedimento: '2026-07-10',
  convenioId: 1,
  medicoResponsavelId: 2,
  status: 'Realizado',
  procedimentos: [
    {
      id: 1,
      cbhpmCodigo: '123',
      descricao: 'Cirurgia',
      quantidade: 1,
      pesoPercentual: 100,
      valorReferencia: 1000,
      valorNegociado: 900,
      ordem: 1,
    },
  ],
} as const;
export const draft = {
  id: 1,
  atendimentoCirurgicoId: 1,
  pacienteId: 1,
  paciente: 'Paciente Teste',
  convenioId: 1,
  numeroGuia: 'G-1',
  competencia: '2026-07-01',
  valorApresentado: 900,
  valorGlosado: 0,
  valorGlosaRecuperada: 0,
  valorReconhecido: 900,
  status: 'Rascunho',
  rowVersion: '',
  itens: [
    {
      id: 1,
      codigo: '123',
      descricao: 'Cirurgia',
      quantidade: 1,
      pesoPercentual: 100,
      valorUnitario: 900,
      valorApresentado: 900,
      valorGlosado: 0,
      valorAprovado: 900,
      status: 'Rascunho',
      ordem: 1,
    },
  ],
  glosas: [],
} as Faturamento;
export const conta = {
  id: 1,
  faturamentoId: 1,
  pacienteId: 1,
  paciente: 'Paciente Teste',
  convenioId: 1,
  numeroDocumento: 'TIT-1',
  descricao: 'Honorários',
  competencia: '2026-07-01',
  dataEmissao: '2026-07-10',
  dataVencimento: '2026-07-20',
  valorOriginal: 900,
  valorAjustado: 900,
  valorRecebido: 300,
  saldoAberto: 600,
  status: 'Vencido',
  rowVersion: '',
  recebimentos: [
    {
      id: 1,
      dataRecebimento: '2026-07-15',
      valorRecebido: 300,
      formaRecebimento: 'Pix',
      documentoComprovante: 'https://storage.test/file',
      estornado: false,
    },
  ],
} as ContaReceber;

export function setupBillingMocks() {
  vi.mocked(services.getAtendimentos).mockResolvedValue([atendimento as never]);
  vi.mocked(services.getFaturamentos).mockResolvedValue([draft]);
  vi.mocked(services.getContasReceber).mockResolvedValue([conta]);
  vi.mocked(services.getConvenioProcedimentoPrecos).mockResolvedValue([]);
  vi.mocked(services.getCbhpmGeral).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
  vi.mocked(services.getPacientes).mockResolvedValue({
    items: [{ id: 1, nomePaciente: 'Paciente Teste' }],
    page: 1,
    pageSize: 100,
    totalItems: 1,
    totalPages: 1,
  } as never);
  vi.mocked(services.getHospitais).mockResolvedValue([{ id: 1, nome: 'Hospital Teste' }]);
  vi.mocked(services.getFinanceiroResumo).mockResolvedValue({
    valorApresentado: 900,
    valorGlosado: 0,
    valorRecuperado: 0,
    valorReconhecido: 900,
    valorRecebido: 300,
    saldoAberto: 600,
    valorVencido: 600,
    recebimentosPeriodo: 300,
    titulosVencidos: 1,
    porCompetencia: [],
  });
  vi.mocked(services.searchContasReceber).mockResolvedValue({
    items: [conta],
    page: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
  });
  vi.mocked(services.createAtendimento).mockResolvedValue(atendimento as never);
  vi.mocked(services.updateAtendimento).mockResolvedValue(atendimento as never);
  vi.mocked(services.deleteAtendimento).mockResolvedValue(undefined);
  vi.mocked(services.createFaturamento).mockResolvedValue(draft);
  vi.mocked(services.updateFaturamento).mockResolvedValue(draft);
  vi.mocked(services.deleteFaturamento).mockResolvedValue(undefined);
  vi.mocked(services.updateFaturamentoItem).mockResolvedValue(draft);
  vi.mocked(services.registrarRecebimento).mockResolvedValue(conta);
  vi.mocked(services.estornarRecebimento).mockResolvedValue(conta);
  vi.mocked(services.updateFaturamentoStatus).mockResolvedValue(draft);
  vi.mocked(services.gerarContaReceber).mockResolvedValue(conta);
  vi.mocked(services.updateGlosa).mockResolvedValue(draft);
  vi.mocked(services.updateRecursoGlosa).mockResolvedValue(draft);
}

export function billingPage(
  section: 'atendimentos' | 'faturamento' | 'financeiro' | 'precos' = 'atendimentos',
) {
  return (
    <BillingPage
      section={section}
      session={session}
      medicalUsers={[{ id: 2, nome: 'Dra. Teste', email: 'dra@teste.local' }]}
      convenios={[{ idConvenio: 1, descricaoConvenio: 'Convênio Teste' }]}
      opmeFornecedores={[{ idFornecedor: 1, fornecedor: 'Promedom' }]}
      isAdmin
      isMedical={false}
    />
  );
}

export function renderBillingPage(
  section: 'atendimentos' | 'faturamento' | 'financeiro' | 'precos' = 'atendimentos',
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>{billingPage(section)}</QueryClientProvider>,
  );
  return {
    ...view,
    rerender: (ui: ReactElement) =>
      view.rerender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}
