import { describe, expect, it } from 'vitest';
import { emptyPacienteForm } from '../patientUtils';
import { getPacienteFormExportRows, pacienteFormExportColumns } from './patientExportData';
import { createXlsxBlob } from './xlsxWriter';

describe('xlsxWriter', () => {
  it('usa o schema do formulario e preserva campos exclusivos no arquivo', async () => {
    const rows = getPacienteFormExportRows({
      ...emptyPacienteForm,
      nomePaciente: 'Paciente Exportado',
      diagnostico: 'Diagnóstico de teste',
      tratamentoMedico: 'Tratamento de teste',
      procedimentos: [{
        cbhpmCodigo: '1.01.01.01-2',
        cbhpmPorte: '2B',
        procedimento: 'Consulta',
        valorReferencia: 120,
      }],
    });
    const headers = pacienteFormExportColumns.map((column) => column.header);

    const blob = createXlsxBlob(rows, headers, 'Cadastro paciente');
    const binaryContent = new TextDecoder().decode(await blob.arrayBuffer());

    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(binaryContent).toContain('Informações Adicionais');
    expect(binaryContent).toContain('Tratamento médico');
    expect(binaryContent).toContain('Diagnóstico de teste');
    expect(binaryContent).toContain('Paciente Exportado');
  });

  it('escapa valores com caracteres reservados no XML', async () => {
    const blob = createXlsxBlob(
      [{ Paciente: 'Ana & João <teste>' }],
      ['Paciente'],
    );

    const binaryContent = new TextDecoder().decode(await blob.arrayBuffer());
    expect(binaryContent).toContain('Ana &amp; João &lt;teste&gt;');
  });
});
