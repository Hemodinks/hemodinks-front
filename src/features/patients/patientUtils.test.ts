import { describe, expect, it } from 'vitest';
import type { Paciente } from '../../types';
import {
  emptyPacienteForm,
  getPacienteFormData,
  normalizeCbhpmCodigo,
  normalizePacienteProcedimentos,
  toPacientePayload,
} from './patientUtils';

describe('patientUtils', () => {
  it('remove pontuacao de codigos CBHPM', () => {
    expect(normalizeCbhpmCodigo('1.01.01.01-2')).toBe('10101012');
    expect(normalizeCbhpmCodigo(' 2.01.01.20-1 ')).toBe('20101201');
    expect(normalizeCbhpmCodigo(null)).toBe('');
  });

  it('normaliza e deduplica procedimentos por codigo limpo', () => {
    const result = normalizePacienteProcedimentos([
      {
        cbhpmCodigo: '1.01.01.01-2',
        cbhpmPorte: '2B',
        procedimento: 'Consulta',
      },
      {
        cbhpmCodigo: '10101012',
        cbhpmPorte: '2B',
        procedimento: 'Consulta duplicada',
      },
      {
        cbhpmCodigo: '2.01.01.20-1',
        cbhpmPorte: '2B',
        procedimento: 'Avaliacao clinica',
        valorReferencia: 125.5,
      },
    ]);

    expect(result).toEqual([
      {
        cbhpmCodigo: '10101012',
        cbhpmPorte: '2B',
        procedimento: 'Consulta',
        valorReferencia: null,
      },
      {
        cbhpmCodigo: '20101201',
        cbhpmPorte: '2B',
        procedimento: 'Avaliacao clinica',
        valorReferencia: 125.5,
      },
    ]);
  });

  it('monta payload de paciente com codigos de procedimentos sem pontuacao', () => {
    const payload = toPacientePayload({
      ...emptyPacienteForm,
      nomePaciente: 'Paciente Hemodinks',
      cpf: '529.982.247-25',
      telefone: '+55 (81) 99999-9999',
      hospitalId: 1,
      hospital: 'Santa Clara - Mater Dei',
      procedimentos: [
        {
          cbhpmCodigo: '1.01.01.01-2',
          cbhpmPorte: '2B',
          procedimento: 'Consulta',
          valorReferencia: 120,
        },
        {
          cbhpmCodigo: '2.01.01.20-1',
          cbhpmPorte: '2B',
          procedimento: 'Avaliacao clinica',
          valorReferencia: 125.5,
        },
      ],
    });

    expect(payload.cbhpmCodigo).toBe('10101012');
    expect(payload.procedimentos.map((item) => item.cbhpmCodigo)).toEqual(['10101012', '20101201']);
  });

  it('normaliza codigos vindos da API ao preencher o formulario', () => {
    const paciente: Paciente = {
      id: 10,
      userId: 20,
      data: '2026-06-01T00:00:00Z',
      nomePaciente: 'Paciente Hemodinks',
      hospitalId: 1,
      hospital: 'Santa Clara - Mater Dei',
      medicoUserId: 1,
      medico: 'Dra. Ana',
      convenioId: 7,
      convenio: 'Particular',
      cbhpmCodigo: '1.01.01.01-2',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      procedimentos: [
        {
          cbhpmCodigo: '1.01.01.01-2',
          cbhpmPorte: '2B',
          procedimento: 'Consulta',
          valorReferencia: null,
          ordem: 1,
        },
      ],
      autorizacao: 'AUT-1',
      pagamento: 'Pix',
      repasseGlosa: 'Sem glosa',
      statusPago: true,
      cpf: '11144477735',
      email: 'paciente@hemodinks.com',
      telefone: '+5581998888888',
      fotoPerfil: null,
      dataNascimento: '1992-05-10T00:00:00Z',
      ativo: true,
      arquivosCount: 0,
      arquivos: [],
    };

    const formData = getPacienteFormData(paciente);

    expect(formData.cbhpmCodigo).toBe('10101012');
    expect(formData.procedimentos[0].cbhpmCodigo).toBe('10101012');
  });
});
