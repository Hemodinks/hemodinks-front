import { describe, expect, it } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import { buildBillingRecords, createEmptyBillingFilters, filterBillingRecords, summarizeBillingRecords } from '../billing/billingUtils';
import { areBillingFiltersEqual } from '../billing/billingPageUtils';
import { emptyReportFilters, enrichReportRecords, filterReportRecords } from './reportFilters';
import * as exportData from './export/reportExportData';

function records() {
  return enrichReportRecords(buildBillingRecords([
    { ...basePaciente, id: 101, tipoCirurgia: 'Eletiva', pagamento: '100,00', repasseGlosa: '10,00' },
    { ...basePaciente, id: 102, tipoCirurgia: 'Urgencia', pagamento: '250,00', repasseGlosa: '20,00',
      procedimentos: [{ procedimento: 'Procedimento A' }, { procedimento: 'Procedimento B' }] },
    { ...basePaciente, id: 103, tipoCirurgia: 'Urgencia', pagamento: '50,00', repasseGlosa: '0,00' },
  ]), [], []);
}

describe('tipo de cirurgia nas consultas e relatórios', () => {
  it('filtra faturamento por tipo sem confundir com status e mantém totais', () => {
    const all = records();
    const selected = filterBillingRecords(all, { ...createEmptyBillingFilters(), tipoCirurgia: 'Urgencia' });
    expect(selected.map(record => record.id).sort()).toEqual([102, 103]);
    expect(summarizeBillingRecords(selected)).toMatchObject({ totalRecords: 2, totalGrossAmount: 300, totalGlosaAmount: 20, totalNetAmount: 280 });
    expect(filterBillingRecords(all, { ...createEmptyBillingFilters(), tipoCirurgia: 'Eletiva', status: 'paid' })).toHaveLength(1);
    expect(filterBillingRecords(all, createEmptyBillingFilters())).toHaveLength(3);
  });

  it('inclui tipo na comparação entre rascunho e filtros consultados', () => {
    expect(areBillingFiltersEqual(createEmptyBillingFilters(), { ...createEmptyBillingFilters(), tipoCirurgia: 'Urgencia' })).toBe(false);
  });

  it('consulta e linhas exportáveis usam o mesmo conjunto selecionado', () => {
    const selected = filterReportRecords(records(), { ...emptyReportFilters, tipoCirurgia: 'Urgencia' });
    expect(selected.map(record => record.id).sort()).toEqual([102, 103]);
    const rows = exportData.getReportExportRows(selected);
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row['Tipo de cirurgia'])).toEqual(['Urgência', 'Urgência']);
    expect(filterReportRecords(records(), emptyReportFilters)).toHaveLength(3);
  });

  it('não inventa classificação para resposta sem tipo e mantém atendimento nos totais', () => {
    const [source] = records();
    const legacy = { ...source, paciente: { ...source.paciente, tipoCirurgia: undefined } };
    const all = [legacy];
    expect(filterReportRecords(all, emptyReportFilters)).toHaveLength(1);
    expect(filterReportRecords(all, { ...emptyReportFilters, tipoCirurgia: 'Eletiva' })).toHaveLength(0);
    expect(exportData.getReportSurgeryTypeRows(all)).toEqual([
      { 'Tipo de cirurgia': 'Não informado', Atendimentos: '1', Faturado: 'R$\u00a0100,00', Glosa: 'R$\u00a010,00', Líquido: 'R$\u00a090,00' },
    ]);
    expect(exportData.getReportSurgeryTypeRows([])).toEqual([]);
  });

  it('resume uma vez por atendimento, independentemente da quantidade de procedimentos', () => {
    expect(exportData.getReportSurgeryTypeRows(records())).toEqual([
      { 'Tipo de cirurgia': 'Eletiva', Atendimentos: '1', Faturado: 'R$\u00a0100,00', Glosa: 'R$\u00a010,00', Líquido: 'R$\u00a090,00' },
      { 'Tipo de cirurgia': 'Urgência', Atendimentos: '2', Faturado: 'R$\u00a0300,00', Glosa: 'R$\u00a020,00', Líquido: 'R$\u00a0280,00' },
    ]);
  });
});
