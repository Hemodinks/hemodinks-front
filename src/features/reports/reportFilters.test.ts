import { describe, expect, it } from 'vitest';
import type { BillingRecord } from '../billing/billingTypes';
import { emptyReportFilters, enrichReportRecords, filterReportRecords, validateReportDateRange } from './reportFilters';

function record(overrides: Partial<BillingRecord> = {}) {
  return {
    id: 1,
    doctorUserId: 10,
    doctorName: 'Dra. Ana',
    assistantNames: [],
    surgeryDate: '2026-06-15T00:00:00Z',
    paciente: {
      data: '2026-06-10T00:00:00Z',
      dataAtendimento: '2026-06-15T00:00:00Z',
    },
    hospitalName: 'Hospital Central',
    convenioName: 'Unimed',
    procedures: [{ procedimento: 'Consulta', cbhpmCodigo: '10101012' }],
    opmeSupplier: 'Fornecedor OPME',
    ...overrides,
  } as BillingRecord;
}

describe('filtros de relatórios', () => {
  it('filtra a data do atendimento de forma inclusiva e sem deslocamento de fuso', () => {
    const records = enrichReportRecords([record()], [], []);
    expect(filterReportRecords(records, { ...emptyReportFilters, startDate: '15/06/2026', endDate: '15/06/2026' })).toHaveLength(1);
    expect(filterReportRecords(records, { ...emptyReportFilters, startDate: '16/06/2026' })).toHaveLength(0);
  });

  it('filtra a data da solicitação independentemente da data do atendimento', () => {
    const records = enrichReportRecords([record()], [], []);
    expect(filterReportRecords(records, {
      ...emptyReportFilters,
      requestStartDate: '10/06/2026',
      requestEndDate: '10/06/2026',
    })).toHaveLength(1);
    expect(filterReportRecords(records, { ...emptyReportFilters, requestStartDate: '11/06/2026' })).toHaveLength(0);
  });

  it('relaciona equipe e grupo pelos membros médicos e aplica seleção múltipla', () => {
    const records = enrichReportRecords([record()], [{
      id: 2, nome: 'Ortopedia', ativo: true, dataCadastro: '', membrosCount: 1,
      membros: [{ userId: 10, nome: 'Dra. Ana', email: 'ana@teste.com' }],
    }], [{
      id: 3, nome: 'Equipe Azul', usuarioLoginId: 1, email: '', modoIdentificacao: 'Nenhuma', ativa: true,
      membros: [{ userId: 10, nome: 'Dra. Ana', email: '', perfilId: 2, operadorId: 1, operadorAtivo: true, possuiPin: false, precisaTrocarPin: false }],
    }]);
    expect(records[0].teamNames).toEqual(['Equipe Azul']);
    expect(records[0].medicalGroupNames).toEqual(['Ortopedia']);
    expect(filterReportRecords(records, { ...emptyReportFilters, teams: ['Equipe Azul'], medicalGroups: ['Ortopedia'] })).toHaveLength(1);
    expect(filterReportRecords(records, { ...emptyReportFilters, teams: ['Outra equipe'] })).toHaveLength(0);
  });

  it('rejeita intervalos inválidos antes da consulta', () => {
    expect(validateReportDateRange({ ...emptyReportFilters, startDate: '31/02/2026' })).toMatch(/datas válidas/i);
    expect(validateReportDateRange({ ...emptyReportFilters, startDate: '20/06/2026', endDate: '10/06/2026' })).toMatch(/posterior/i);
    expect(validateReportDateRange({ ...emptyReportFilters, requestStartDate: '31/02/2026' })).toMatch(/solicitação/i);
    expect(validateReportDateRange({
      ...emptyReportFilters,
      requestStartDate: '20/06/2026',
      requestEndDate: '10/06/2026',
    })).toMatch(/solicitação/i);
  });

  it('filtra por status, regime e pendências de faturamento', () => {
    const records = enrichReportRecords([
      record({ id: 1, status: 'paid', regime: 'convenio', glosaAmount: 0, pendingChecklistItems: 0 }),
      record({ id: 2, status: 'pending', regime: 'particular', glosaAmount: 50, pendingChecklistItems: 2 }),
    ], [], []);

    expect(filterReportRecords(records, { ...emptyReportFilters, status: 'paid' }).map((item) => item.id)).toEqual([1]);
    expect(filterReportRecords(records, { ...emptyReportFilters, status: 'glosa' }).map((item) => item.id)).toEqual([2]);
    expect(filterReportRecords(records, { ...emptyReportFilters, regime: 'particular' }).map((item) => item.id)).toEqual([2]);
    expect(filterReportRecords(records, { ...emptyReportFilters, onlyPendingItems: true }).map((item) => item.id)).toEqual([2]);
  });
});
