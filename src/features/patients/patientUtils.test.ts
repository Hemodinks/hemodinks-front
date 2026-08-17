import { describe, expect, it } from 'vitest';
import type { Paciente } from '../../types';
import {
  emptyPacienteForm,
  getCalculatedGlosaValue,
  getDuplicatedMedicalTeamError,
  getPacienteFilterQuery,
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

  it('calcula a glosa a partir do valor estimado menos o valor recebido', () => {
    expect(getCalculatedGlosaValue(300, '')).toBe('R$ 300,00');
    expect(getCalculatedGlosaValue(300, 'R$ 287,50')).toBe('R$ 12,50');
    expect(getCalculatedGlosaValue(300, 'R$ 350,00')).toBe('R$ 0,00');
    expect(getCalculatedGlosaValue(0, '')).toBe('');
  });

  it('converte as datas de atendimento dos filtros para o formato da API', () => {
    expect(getPacienteFilterQuery({
      medicoUserIds: [],
      convenioIds: [],
      procedimento: '',
      dataInicio: '01/06/2026',
      dataFinal: '30/06/2026',
      dataSolicitacaoInicio: '05/06/2026',
      dataSolicitacaoFinal: '25/06/2026',
    })).toEqual({
      dataInicio: '2026-06-01',
      dataFinal: '2026-06-30',
      dataSolicitacaoInicio: '2026-06-05',
      dataSolicitacaoFinal: '2026-06-25',
    });
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
    expect(payload.dataPagamento).toBeNull();
    expect(payload.procedimentos.map((item) => item.cbhpmCodigo)).toEqual(['10101012', '20101201']);
  });

  it('envia a data do pagamento apenas quando o status está pago', () => {
    const paidPayload = toPacientePayload({
      ...emptyPacienteForm,
      nomePaciente: 'Paciente Pago',
      hospital: 'Hospital Teste',
      procedimento: 'Consulta',
      statusPago: true,
      dataPagamento: '20/06/2026',
    });
    const pendingPayload = toPacientePayload({
      ...emptyPacienteForm,
      nomePaciente: 'Paciente Pendente',
      hospital: 'Hospital Teste',
      procedimento: 'Consulta',
      statusPago: false,
      dataPagamento: '20/06/2026',
    });

    expect(paidPayload.dataPagamento).toBe('2026-06-20');
    expect(pendingPayload.dataPagamento).toBeNull();
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
