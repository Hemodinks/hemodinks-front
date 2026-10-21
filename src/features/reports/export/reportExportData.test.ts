import { describe, expect, it } from 'vitest';
import { getReportPendingRows, reportColumns } from './reportExportData';
import type { ReportRecord } from '../reportTypes';

describe('dados exportáveis dos relatórios', () => {
  it('não inclui dados pessoais desnecessários', () => {
    const headers = reportColumns.map((column) => column.header);
    expect(headers).toContain('Paciente');
    expect(headers).toContain('Faturado');
    expect(headers).toContain('Data do pagamento');
    expect(headers).not.toContain('CPF');
    expect(headers).not.toContain('E-mail');
    expect(headers).not.toContain('Telefone');
  });

  it('detalha somente warning/missing sem transformar checklist de pago em dívida', () => {
    const record = {
      id: 42, surgeryDateLabel: '14/10/2026', statusLabel: 'Pago',
      billingChecklist: [
        { label: 'Guia', status: 'warning', value: 'Validar arquivo', hint: 'Conferir anexos' },
        { label: 'Código', status: 'missing', value: 'Não informado' },
        { label: 'Honorários', status: 'ok', value: 'Informado' },
      ],
    } as ReportRecord;
    expect(getReportPendingRows([record])).toEqual([
      { Atendimento: '42', 'Data da cirurgia': '14/10/2026', 'Situação do pagamento': 'Pago', Natureza: 'Checklist documental/operacional', Item: 'Guia', Status: 'Atenção', 'Descrição / valor': 'Validar arquivo', 'Motivo / orientação': 'Conferir anexos' },
      { Atendimento: '42', 'Data da cirurgia': '14/10/2026', 'Situação do pagamento': 'Pago', Natureza: 'Checklist documental/operacional', Item: 'Código', Status: 'Pendente', 'Descrição / valor': 'Não informado', 'Motivo / orientação': '-' },
    ]);
    expect(reportColumns.map((column) => column.header)).toContain('Itens pendentes do checklist');
  });

  it('preserva ordem dos registros e não inventa itens na lista vazia', () => {
    expect(getReportPendingRows([])).toEqual([]);
    expect(getReportPendingRows([{ billingChecklist: [] } as unknown as ReportRecord])).toEqual([]);
  });
});
