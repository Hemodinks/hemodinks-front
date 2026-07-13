import { describe, expect, it } from 'vitest';
import type { Paciente } from '../../types';
import {
  buildBillingRecords,
  createEmptyBillingFilters,
  filterBillingRecords,
  groupBillingByConvenio,
  groupBillingByDoctor,
  summarizeBillingRecords,
} from './billingUtils';

const basePaciente: Paciente = {
  id: 1,
  userId: 11,
  data: '2026-06-18T00:00:00Z',
  nomePaciente: 'Maria de Souza',
  diagnostico: 'Diagnostico',
  tratamentoMedico: 'Tratamento',
  hospitalId: 2,
  hospital: 'Hospital Central',
  medicoUserId: 7,
  medico: 'Dra. Helena Cortez',
  medicoAuxiliar1UserId: 8,
  medicoAuxiliar1: 'Dr. Andre Lima',
  medicoAuxiliar2UserId: null,
  medicoAuxiliar2: '',
  convenioId: 3,
  convenio: 'Unimed',
  opmeFornecedorId: 4,
  opmeFornecedor: 'OPME Prime',
  cbhpmCodigo: '3.14.15.92-0',
  cbhpmPorte: '6C',
  procedimento: 'Colecistectomia por video',
  procedimentos: [
    {
      cbhpmCodigo: '3.14.15.92-0',
      cbhpmPorte: '6C',
      procedimento: 'Colecistectomia por video',
      valorReferencia: 3200,
      ordem: 1,
    },
    {
      cbhpmCodigo: '3.14.15.93-8',
      cbhpmPorte: '4B',
      procedimento: 'Lise de aderencias',
      valorReferencia: 800,
      ordem: 2,
    },
  ],
  autorizacao: 'AUT-9981',
  pagamento: 'R$ 4.800,00',
  repasseGlosa: 'R$ 300,00',
  statusPago: true,
  cpf: '12345678900',
  email: 'maria@example.com',
  telefone: '+5581999999999',
  fotoPerfil: null,
  dataNascimento: '1988-06-12T00:00:00Z',
  ativo: true,
  arquivosCount: 2,
  arquivos: [],
};

function createFaturamento(overrides: Partial<NonNullable<Paciente['faturamento']>> = {}): NonNullable<Paciente['faturamento']> {
  return {
    id: 1,
    pacienteId: 1,
    anestesistaFaturadoSeparado: false,
    conferenciaPagamentoRealizada: false,
    dataCadastro: '2026-07-05T10:00:00Z',
    ...overrides,
  };
}

describe('billingUtils', () => {
  it('inicia filtros de faturamento sem competencia selecionada', () => {
    const filters = createEmptyBillingFilters('');

    expect(filters.competenciaInicio).toBe('');
    expect(filters.competenciaFinal).toBe('');
  });

  it('transforma paciente em registro de faturamento com totais e checklist', () => {
    const [record] = buildBillingRecords([basePaciente]);

    expect(record.patientName).toBe('Maria de Souza');
    expect(record.paymentAmount).toBe(4800);
    expect(record.glosaAmount).toBe(300);
    expect(record.netAmount).toBe(4500);
    expect(record.regime).toBe('convenio');
    expect(record.status).toBe('paid');
    expect(record.procedureCodes).toEqual(['31415920', '31415938']);
    expect(record.pendingChecklistItems).toBeGreaterThan(0);
  });

  it('resume e agrupa faturamento por medico e convenio', () => {
    const records = buildBillingRecords([
      basePaciente,
      {
        ...basePaciente,
        id: 2,
        nomePaciente: 'Joao Particular',
        convenioId: null,
        convenio: '',
        pagamento: 'R$ 1.250,00',
        repasseGlosa: '',
        statusPago: false,
        autorizacao: '',
      },
    ]);

    const summary = summarizeBillingRecords(records);
    const doctorGroups = groupBillingByDoctor(records);
    const convenioGroups = groupBillingByConvenio(records);

    expect(summary.totalRecords).toBe(2);
    expect(summary.totalGrossAmount).toBe(6050);
    expect(summary.totalGlosaAmount).toBe(300);
    expect(summary.particularCount).toBe(1);
    expect(summary.convenioCount).toBe(1);
    expect(doctorGroups[0].label).toBe('Dra. Helena Cortez');
    expect(doctorGroups[0].totalRecords).toBe(2);
    expect(convenioGroups.map((item) => item.label)).toEqual(['Unimed', 'Particular']);
  });

  it('filtra competencia pela data de cadastro do faturamento quando informada', () => {
    const records = buildBillingRecords([
      {
        ...basePaciente,
        id: 4,
        nomePaciente: 'Cadastro Julho',
        data: '2026-06-18T00:00:00Z',
        faturamento: createFaturamento({
          id: 4,
          pacienteId: 4,
          dataCadastro: '2026-07-05T10:00:00Z',
        }),
      },
      {
        ...basePaciente,
        id: 5,
        nomePaciente: 'Cadastro Agosto',
        data: '2026-07-10T00:00:00Z',
        faturamento: createFaturamento({
          id: 5,
          pacienteId: 5,
          dataCadastro: '2026-08-02T10:00:00Z',
        }),
      },
    ]);

    const filtered = filterBillingRecords(records, {
      ...createEmptyBillingFilters(''),
      competenciaInicio: '2026-07',
      competenciaFinal: '2026-07',
    });

    expect(records.find((record) => record.id === 4)?.competenciaInicio).toBe('2026-07-05T10:00:00Z');
    expect(filtered.map((record) => record.id)).toEqual([4]);
  });

  it('filtra registros para medico atual, periodo, glosa e pendencias', () => {
    const records = buildBillingRecords([
      basePaciente,
      {
        ...basePaciente,
        id: 3,
        nomePaciente: 'Paciente Sem Valor',
        medicoUserId: 99,
        medico: 'Dr. Outro',
        data: '2026-06-01T00:00:00Z',
        pagamento: 'Pix',
        repasseGlosa: '',
        statusPago: false,
        autorizacao: '',
      },
    ]);

    const filtered = filterBillingRecords(records, {
      ...createEmptyBillingFilters(''),
      competenciaInicio: '2026-06',
      competenciaFinal: '2026-06',
      status: 'glosa',
      onlyPendingItems: true,
    }, {
      restrictToMedicalUser: true,
      currentMedicalUserId: 7,
      currentMedicalUserName: 'Dra. Helena Cortez',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });
});
