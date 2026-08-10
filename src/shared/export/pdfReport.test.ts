import { describe, expect, it, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { drawPdfReportHeader } from './pdfReport';
import type { ReportIdentity } from './reportIdentity';

describe('padrão visual do PDF', () => {
  it('desenha fundo branco explicitamente antes do cabeçalho institucional', () => {
    const rect = vi.fn();
    const setFillColor = vi.fn();
    const document = {
      internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
      setFillColor,
      rect,
      setTextColor: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      splitTextToSize: (text: string) => [text],
      text: vi.fn(),
      addImage: vi.fn(),
    } as unknown as jsPDF;
    const identity: ReportIdentity = {
      clinicName: 'Clínica Teste Local',
      title: 'Cadastro de paciente',
      generatedAt: new Date('2026-08-10T15:00:00-03:00'),
      primaryColor: '#14877D',
      contextLines: [],
      logo: null,
    };

    drawPdfReportHeader(document, identity);

    expect(setFillColor).toHaveBeenNthCalledWith(1, 255, 255, 255);
    expect(rect).toHaveBeenNthCalledWith(1, 0, 0, 595, 842, 'F');
    expect(setFillColor).toHaveBeenNthCalledWith(2, 20, 135, 125);
  });
});
