import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { downloadBlob } from '../../../shared/utils/downloadFile';
import { resolveReportIdentity } from '../../../shared/export/reportIdentity';
import { advanceSessionEpoch } from '../../../services/sessionEpoch';
import { buildBillingRecords } from '../../billing/billingUtils';
import { basePaciente } from '../../../test/appTestData';
import type { ReportRecord } from '../reportTypes';
import { exportReport } from './reportExporter';

const captured = vi.hoisted(() => ({ documents: [] as Array<{ getNumberOfPages(): number; output(type: 'arraybuffer'): ArrayBuffer }>, save: vi.fn() }));
vi.mock('jspdf', async () => {
  const actual = await vi.importActual<typeof import('jspdf')>('jspdf');
  return { ...actual, jsPDF: function (...args: ConstructorParameters<typeof actual.jsPDF>) {
    const document = new actual.jsPDF(...args);
    document.save = captured.save;
    captured.documents.push(document);
    return document;
  } };
});
vi.mock('../../../shared/utils/downloadFile', () => ({ downloadBlob: vi.fn() }));
vi.mock('../../../shared/export/reportIdentity', async () => ({
  ...await vi.importActual('../../../shared/export/reportIdentity'),
  resolveReportIdentity: vi.fn(async (options) => ({ ...options, generatedAt: new Date('2026-10-14T12:00:00Z'), primaryColor: '#14877D', logo: null })),
}));

function record(id = 42): ReportRecord {
  return { ...buildBillingRecords([{ ...basePaciente, id, statusPago: true }])[0], teamNames: [], medicalGroupNames: [], pendingChecklistItems: 5,
    billingChecklist: Array.from({ length: 5 }, (_, index) => ({ label: `Item ${index + 1}`, status: index % 2 ? 'warning' : 'missing', value: `Descrição ${index + 1}`, hint: `Motivo real ${index + 1}` })),
  };
}

describe('exportação sintética e completa da consulta', () => {
  beforeEach(() => { vi.clearAllMocks(); captured.documents.length = 0; });

  it.each(['synthetic', 'complete'] as const)('XLSX %s preserva ordem e distingue cinco itens de zero pagamentos pendentes', async (detailLevel) => {
    await exportReport({ format: 'xlsx', records: [record(42), record(7)], companyName: 'Clínica', detailLevel, contextLines: ['Filtro: cirurgião selecionado'] });
    const blob = vi.mocked(downloadBlob).mock.calls[0][0] as Blob;
    const content = new TextDecoder().decode(await blob.arrayBuffer());
    expect(content).toContain('sheet name="Atendimentos"');
    expect(content).toContain('Pagamentos pendentes: 0');
    expect(content).toContain('Itens pendentes do checklist: 10');
    expect(content).toContain('Filtro: cirurgião selecionado');
    if (detailLevel === 'complete') {
      expect(content).toContain('Detalhamento de pendências');
      expect(content.match(/Motivo real /g)).toHaveLength(10);
      expect(content.indexOf('>42<')).toBeLessThan(content.indexOf('>7<'));
    } else {
      expect(content).not.toContain('Motivo real');
      expect(content).not.toContain('Detalhamento de pendências');
    }
  });

  it('Completo é padrão e informa atendimento sem itens sem linha fictícia de pendência', async () => {
    await exportReport({ format: 'xlsx', records: [{ ...record(), billingChecklist: [], pendingChecklistItems: 0 }], companyName: 'Clínica' });
    const blob = vi.mocked(downloadBlob).mock.calls[0][0] as Blob;
    const content = new TextDecoder().decode(await blob.arrayBuffer());
    expect(content).toContain('Nenhuma pendência encontrada no checklist da consulta.');
    expect(content).toContain('1 atendimento(s)');
    expect(content).not.toContain('Motivo real');
  });

  it.each(['synthetic', 'complete'] as const)('gera PDF %s real com itens apenas no anexo completo e paginação extensa', async (detailLevel) => {
    void jsPDF;
    const records = Array.from({ length: 80 }, (_, index) => record(index + 1));
    await exportReport({ format: 'pdf', records, companyName: 'Clínica', detailLevel });
    const document = captured.documents[0];
    expect(document.getNumberOfPages()).toBeGreaterThan(1);
    const content = new TextDecoder().decode(document.output('arraybuffer'));
    expect(content.includes('Motivo real')).toBe(detailLevel === 'complete');
    expect(content.match(/Motivo real /g)?.length ?? 0).toBe(detailLevel === 'complete' ? 400 : 0);
    expect(captured.save).toHaveBeenCalledOnce();
  });

  it('PDF completo de atendimento sem itens informa ausência sem adicionar página vazia', async () => {
    await exportReport({ format: 'pdf', records: [{ ...record(), billingChecklist: [], pendingChecklistItems: 0 }], companyName: 'Clínica' });
    const document = captured.documents[0];
    expect(document.getNumberOfPages()).toBe(1);
    expect(new TextDecoder().decode(document.output('arraybuffer'))).toContain('Nenhuma pend');
  });

  it('não salva PDF se a consulta for invalidada durante a geração', async () => {
    const shouldContinue = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await exportReport({ format: 'pdf', records: [record()], companyName: 'Clínica', shouldContinue });
    expect(captured.save).not.toHaveBeenCalled();
  });

  it.each(['xlsx', 'pdf'] as const)('cancela %s se sessão mudar enquanto carrega identidade', async (format) => {
    const original = vi.mocked(resolveReportIdentity).getMockImplementation()!;
    vi.mocked(resolveReportIdentity).mockImplementationOnce(async (...args) => { advanceSessionEpoch(); return original(...args); });
    await exportReport({ format, records: [record()], companyName: 'Clínica' });
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(captured.save).not.toHaveBeenCalled();
  });

  it('cancela a exportação quando a consulta deixa de ser válida', async () => {
    await exportReport({ format: 'xlsx', records: [record()], companyName: 'Clínica', shouldContinue: () => false });
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
