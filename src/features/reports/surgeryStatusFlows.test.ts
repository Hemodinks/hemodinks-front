import { describe, expect, it } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import { buildListQueryParams } from '../../services/queryParams';
import { deriveSurgeryStatus, getSurgeryStatus, getSurgeryStatusLabel, matchesSurgeryStatus } from '../../shared/surgeryStatus';
import { buildBillingRecords, createEmptyBillingFilters, filterBillingRecords } from '../billing/billingUtils';
import { areBillingFiltersEqual } from '../billing/billingPageUtils';
import { emptyPacienteFilters, getPacienteFilterQuery } from '../patients/patientUtils';
import { getPacienteExportRows, getPacienteFormExportRows } from '../patients/export/patientExportData';
import { emptyPacienteForm } from '../patients/patientUtils';
import { emptyReportFilters, enrichReportRecords, filterReportRecords } from './reportFilters';
import { getReportExportRows } from './export/reportExportData';

function records() {
  return enrichReportRecords(buildBillingRecords([
    { ...basePaciente, id: 201, statusCirurgia: 'Consolidada', dataAtendimento: '2026-10-01T00:00:00' },
    { ...basePaciente, id: 202, statusCirurgia: 'NaoConsolidada', dataAtendimento: null },
    // Resposta anterior ao campo: o status segue a mesma regra da API.
    { ...basePaciente, id: 203, dataAtendimento: '2026-10-02T00:00:00' },
  ]), [], []);
}

describe('issue245: status da cirurgia', () => {
  it('deriva o status pela data da consolidação, com o valor da API como fonte', () => {
    expect(deriveSurgeryStatus('2026-10-01')).toBe('Consolidada');
    expect(deriveSurgeryStatus('')).toBe('NaoConsolidada');
    expect(deriveSurgeryStatus(null)).toBe('NaoConsolidada');
    expect(getSurgeryStatus({ statusCirurgia: 'NaoConsolidada', dataAtendimento: '2026-10-01' })).toBe('NaoConsolidada');
    expect(getSurgeryStatusLabel('NaoConsolidada')).toBe('Não consolidada');
    expect(matchesSurgeryStatus({ dataAtendimento: null }, '')).toBe(true);
  });

  it('envia statusCirurgia para a API apenas quando não é Todas', () => {
    expect(buildListQueryParams({ statusCirurgia: 'Consolidada', page: 2 })?.toString()).toBe('page=2&statusCirurgia=Consolidada');
    expect(buildListQueryParams({ statusCirurgia: '', page: 3 })?.toString()).toBe('page=3');
    expect(getPacienteFilterQuery(emptyPacienteFilters)).not.toHaveProperty('statusCirurgia');
    expect(getPacienteFilterQuery({ ...emptyPacienteFilters, statusCirurgia: 'NaoConsolidada', tipoCirurgia: 'Urgencia' }))
      .toMatchObject({ statusCirurgia: 'NaoConsolidada', tipoCirurgia: 'Urgencia' });
  });

  it('filtra faturamento e relatórios por Todas, Consolidadas e Não consolidadas', () => {
    const all = records();
    const ids = (items: { id: number }[]) => items.map((item) => item.id).sort();
    expect(ids(filterBillingRecords(all, createEmptyBillingFilters()))).toEqual([201, 202, 203]);
    expect(ids(filterBillingRecords(all, { ...createEmptyBillingFilters(), statusCirurgia: 'Consolidada' }))).toEqual([201, 203]);
    expect(ids(filterBillingRecords(all, { ...createEmptyBillingFilters(), statusCirurgia: 'NaoConsolidada' }))).toEqual([202]);
    expect(ids(filterReportRecords(all, emptyReportFilters))).toEqual([201, 202, 203]);
    expect(ids(filterReportRecords(all, { ...emptyReportFilters, statusCirurgia: 'Consolidada' }))).toEqual([201, 203]);
    expect(ids(filterReportRecords(all, { ...emptyReportFilters, statusCirurgia: 'NaoConsolidada' }))).toEqual([202]);
  });

  it('considera o status ao comparar rascunho e filtros consultados', () => {
    expect(areBillingFiltersEqual(createEmptyBillingFilters(), { ...createEmptyBillingFilters(), statusCirurgia: 'Consolidada' })).toBe(false);
    expect(areBillingFiltersEqual(createEmptyBillingFilters(), { ...createEmptyBillingFilters(), statusCirurgia: '' })).toBe(true);
  });

  it('exporta o status nos relatórios, na listagem e na ficha', () => {
    const selected = filterReportRecords(records(), { ...emptyReportFilters, statusCirurgia: 'NaoConsolidada' });
    expect(getReportExportRows(selected).map((row) => row['Status da cirurgia'])).toEqual(['Não consolidada']);
    expect(getPacienteExportRows([{ ...basePaciente, statusCirurgia: 'Consolidada' }])[0]['Status da cirurgia']).toBe('Consolidada');
    expect(getPacienteFormExportRows({ ...emptyPacienteForm, dataAtendimento: '01/10/2026' })[0]['Status da cirurgia']).toBe('Consolidada');
    expect(getPacienteFormExportRows({ ...emptyPacienteForm, dataAtendimento: '01/10' })[0]['Status da cirurgia']).toBe('Não consolidada');
  });
});
