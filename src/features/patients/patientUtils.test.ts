import { describe, expect, it } from 'vitest';
import type { Paciente } from '../../types';
import {
  emptyPacienteForm,
  getCalculatedPaymentValue,
  getDuplicatedMedicalTeamError,
  getPacienteFormData,
  normalizeCbhpmCodigo,
  normalizePacienteProcedimentos,
  toPacientePayload,
} from './patientUtils';
import { getPacienteFormExportRows } from './export/patientExportData';

describe('patientUtils', () => {
  it('remove pontuacao de codigos CBHPM', () => {
    expect(normalizeCbhpmCodigo('1.01.01.01-2')).toBe('10101012');
    expect(normalizeCbhpmCodigo(' 2.01.01.20-1 ')).toBe('20101201');
    expect(normalizeCbhpmCodigo(null)).toBe('');
  });

  it('normaliza os procedimentos e preserva ocorrencias repetidas', () => {
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
        cbhpmCodigo: '10101012',
        cbhpmPorte: '2B',
        procedimento: 'Consulta duplicada',
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

  it('calcula o valor recebido a partir do estimado menos a glosa', () => {
    expect(getCalculatedPaymentValue(300, '')).toBe('R$ 300,00');
    expect(getCalculatedPaymentValue(300, 'R$ 12,50')).toBe('R$ 287,50');
    expect(getCalculatedPaymentValue(0, '')).toBe('');
  });

  it('monta payload de paciente com codigos de procedimentos sem pontuacao', () => {
    const payload = toPacientePayload({
      ...emptyPacienteForm,
      nomePaciente: 'Paciente Hemodinks',
      diagnostico: ' Diagnostico clinico de teste ',
      tratamentoMedico: ' Tratamento conservador ',
      cpf: '529.982.247-25',
      telefone: '+55 (81) 99999-9999',
      hospitalId: 1,
      hospital: 'Santa Clara - Mater Dei',
      opmeFornecedorId: 1,
      opmeFornecedor: 'Promedom',
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
    expect(payload.diagnostico).toBe('Diagnostico clinico de teste');
    expect(payload.tratamentoMedico).toBe('Tratamento conservador');
    expect(payload.opmeFornecedorId).toBe(1);
    expect(payload.opmeFornecedor).toBe('Promedom');
    expect(payload.procedimentos.map((item) => item.cbhpmCodigo)).toEqual(['10101012', '20101201']);
  });

  it('exporta uma linha para cada procedimento do formulario em xlsx', () => {
    const rows = getPacienteFormExportRows({
      ...emptyPacienteForm,
      nomePaciente: 'Paciente Teste',
      procedimentos: [
        {
          cbhpmCodigo: '1.01.01.01-2',
          cbhpmPorte: '2B',
          procedimento: 'Consulta',
          valorReferencia: 150,
        },
        {
          cbhpmCodigo: '2.01.01.20-1',
          cbhpmPorte: '3A',
          procedimento: 'Avaliacao clinica',
          valorReferencia: 250,
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]['Procedimento']).toBe('Consulta');
    expect(rows[1]['Procedimento']).toBe('Avaliacao clinica');
    expect(rows[0]['Código CBHPM']).toBe('10101012');
    expect(rows[1]['Código CBHPM']).toBe('20101201');
  });

  it('bloqueia selecao repetida entre cirurgiao e medicos auxiliares', () => {
    expect(getDuplicatedMedicalTeamError({
      ...emptyPacienteForm,
      medicoUserId: 1,
      medico: 'Dra. Ana',
      medicoAuxiliar1UserId: 1,
      medicoAuxiliar1: 'Dra. Ana',
    })).toBe('Cirurgião e médicos auxiliares devem ser diferentes.');

    expect(getDuplicatedMedicalTeamError({
      ...emptyPacienteForm,
      medicoUserId: 1,
      medico: 'Dra. Ana',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Dr. Bruno',
    })).toBe('');
  });

  it('normaliza codigos vindos da API ao preencher o formulario', () => {
    const paciente: Paciente = {
      id: 10,
      userId: 20,
      data: '2026-06-01T00:00:00Z',
      nomePaciente: 'Paciente Hemodinks',
      diagnostico: 'Diagnostico cadastrado',
      tratamentoMedico: 'Tratamento cadastrado',
      hospitalId: 1,
      hospital: 'Santa Clara - Mater Dei',
      medicoUserId: 1,
      medico: 'Dra. Ana',
      convenioId: 7,
      convenio: 'Particular',
      opmeFornecedorId: 2,
      opmeFornecedor: 'AVL',
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
    expect(formData.diagnostico).toBe('Diagnostico cadastrado');
    expect(formData.tratamentoMedico).toBe('Tratamento cadastrado');
    expect(formData.opmeFornecedorId).toBe(2);
    expect(formData.opmeFornecedor).toBe('AVL');
    expect(formData.procedimentos[0].cbhpmCodigo).toBe('10101012');
  });
});
