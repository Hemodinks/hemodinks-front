import { describe, expect, it } from 'vitest';
import { createReportXlsxBlob } from './xlsxReport';
import type { ReportIdentity } from './reportIdentity';

const identity: ReportIdentity = {
  clinicName: 'Clínica São José',
  title: 'Relatório financeiro',
  generatedAt: new Date('2026-08-10T15:30:00-03:00'),
  primaryColor: '#14877D',
  contextLines: ['Período: 01/08/2026 a 10/08/2026'],
  logo: { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), extension: 'png', width: 200, height: 100 },
};

describe('padrão visual do XLSX', () => {
  it('inclui identidade, logo, congelamento, filtro, impressão e formatos tipados', async () => {
    const rows = Array.from({ length: 40 }, (_, index) => ({
      Data: '10/08/2026',
      Descrição: `Procedimento extenso com acentuação número ${index + 1}`,
      Valor: 'R$ 1.234,56',
      Observação: index === 0 ? '' : 'Informado',
    }));
    const blob = createReportXlsxBlob(rows, ['Data', 'Descrição', 'Valor', 'Observação'], { sheetName: 'Financeiro', identity });
    const content = new TextDecoder().decode(await blob.arrayBuffer());

    expect(content).toContain('Clínica São José');
    expect(content).toContain('xl/media/logo.png');
    expect(content).toContain('drawing1.xml');
    expect(content).toContain('state="frozen"');
    expect(content).toContain('<autoFilter');
    expect(content).toContain('fitToWidth="1"');
    expect(content).toContain('numFmtId="164"');
    expect(content).toContain('numFmtId="165"');
    expect(content).toContain('Não informado');
  });

  it('gera planilha válida sem depender de logo', async () => {
    const blob = createReportXlsxBlob([{ Paciente: 'Ana' }], ['Paciente'], {
      identity: { ...identity, logo: null },
    });
    const content = new TextDecoder().decode(await blob.arrayBuffer());
    expect(content).toContain('Clínica São José');
    expect(content).not.toContain('drawing1.xml');
    expect(content).not.toContain('xl/media/logo');
  });
});
