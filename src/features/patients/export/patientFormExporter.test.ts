import { describe, expect, it } from 'vitest';
import type { PacienteFormData, PacienteObservacao } from '../../../types';
import { buildObservationText } from './patientFormExporter';

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
