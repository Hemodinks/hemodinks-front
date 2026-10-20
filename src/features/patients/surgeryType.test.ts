import { describe, expect, it } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import { emptyPacienteFilters, emptyPacienteForm, getPacienteFilterQuery, getPacienteFormData, toPacientePayload } from './patientUtils';
import { getPacienteExportRows, getPacienteFormExportRows } from './export/patientExportData';

describe('issue173: tipo de cirurgia em pacientes', () => {
  it('envia Eletiva no cadastro novo e mantém Urgencia na edição', () => {
    expect(toPacientePayload(emptyPacienteForm).tipoCirurgia).toBe('Eletiva');
    expect(toPacientePayload(getPacienteFormData({ ...basePaciente, tipoCirurgia: 'Urgencia' })).tipoCirurgia).toBe('Urgencia');
  });

  it('não transforma edição sem campo da API em Eletiva', () => {
    const { tipoCirurgia: _, ...legacy } = { ...basePaciente, tipoCirurgia: 'Urgencia' as const };
    expect(getPacienteFormData(legacy).tipoCirurgia).toBeUndefined();
    expect(toPacientePayload(getPacienteFormData(legacy))).not.toHaveProperty('tipoCirurgia');
  });

  it('omite filtro Todos e combina Urgencia com os demais filtros', () => {
    expect(getPacienteFilterQuery(emptyPacienteFilters)).not.toHaveProperty('tipoCirurgia');
    expect(getPacienteFilterQuery({ ...emptyPacienteFilters, tipoCirurgia: 'Urgencia', medicoUserIds: [3], procedimento: 'Cirurgia' }))
      .toMatchObject({ tipoCirurgia: 'Urgencia', medicoUserIds: '3', procedimento: 'Cirurgia' });
  });

  it.each(['Eletiva', 'Urgencia', undefined] as const)('exporta tipo %s na listagem e ficha sem inventar informação', (tipoCirurgia) => {
    const patient = { ...basePaciente, tipoCirurgia };
    const label = tipoCirurgia === 'Urgencia' ? 'Urgência' : tipoCirurgia || 'Não informado';
    expect(getPacienteExportRows([patient])[0]['Tipo de cirurgia']).toBe(label);
    expect(getPacienteFormExportRows(getPacienteFormData(patient))[0]['Tipo de cirurgia']).toBe(label);
  });
});
