import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PacienteFormData, PacienteObservacao } from '../../../types';
import { getPatientExportFileName, getPatientFormExportFileName } from './patientExportData';
import { buildObservationText } from './patientFormExporter';

describe('nome do arquivo da ficha do paciente', () => {
  afterEach(() => { vi.useRealTimers(); });

  it.each(['pdf', 'xlsx'] as const)('mantém o nome como digitado com a data local no %s', (extension) => {
    vi.useFakeTimers({ now: new Date(2026, 10, 5, 23, 30, 5) });

    expect(getPatientFormExportFileName(extension, ' João  da Conceição ')).toBe(`João da Conceição 2026-11-05.${extension}`);
  });

  it('remove do nome o que o Windows não aceita em arquivos', () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 5, 12) });

    expect(getPatientFormExportFileName('pdf', 'Ana/Maria: "Souza"?.')).toBe('Ana Maria Souza 2026-11-05.pdf');
  });

  it('usa um nome genérico quando o paciente não tem nome aproveitável', () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 5, 12) });

    expect(getPatientFormExportFileName('pdf', ' / ')).toBe('Paciente 2026-11-05.pdf');
  });
});

describe('nome do arquivo da lista de pacientes', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('usa a data local à noite, sem avançar para o dia seguinte em UTC', () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 5, 23, 30) });

    expect(getPatientExportFileName('pdf', 'Clínica A')).toBe('pacientes-clinica-a-2026-11-05.pdf');
  });
});

describe('observações da ficha do paciente', () => {
  it('apresenta remetente, destinatário, status, data e hora da conversa', () => {
    const observation = {
      autorNome: 'Dra. Ana',
      autorPerfilNome: 'Médicos',
      destinatarioNome: 'George Marcone',
      destinatarioPerfilNome: 'Administrador',
      dataCadastro: '2026-06-01T10:45:00',
      foiLida: true,
      texto: 'Autorização recebida.',
    } as PacienteObservacao;

    const result = buildObservationText({ novaObservacao: '' } as PacienteFormData, [observation]);

    expect(result.meta).toBe('1 observação(s)');
    expect(result.text).toContain('Remetente: Dra. Ana / Médicos');
    expect(result.text).toContain('Destinatário: George Marcone / Administrador');
    expect(result.text).toContain('Status: Lida');
    expect(result.text).toContain('Data e hora: 01/06/2026, 10:45');
    expect(result.text).toContain('Autorização recebida.');
  });
});
