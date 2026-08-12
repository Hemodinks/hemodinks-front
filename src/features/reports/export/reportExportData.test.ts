import { describe, expect, it } from 'vitest';
import { reportColumns } from './reportExportData';

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
});
