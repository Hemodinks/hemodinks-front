import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import {
  createXlsxBlob,
  downloadBlob,
  getPacienteExportRows,
  getPatientExportFileName,
  pacienteExportColumns,
} from './patientExport';

describe('patientExport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('transforma pacientes em todas as colunas exportáveis', () => {
    const [row] = getPacienteExportRows([
      {
        ...basePaciente,
        nomePaciente: '  paciente hemodinks  ',
        medicoAuxiliar1: null,
        medicoAuxiliar2: '',
        opmeFornecedor: null,
        arquivosCount: 0,
      },
    ]);

    expect(Object.keys(row)).toHaveLength(pacienteExportColumns.length);
    expect(row).toMatchObject({
      Paciente: 'Paciente Hemodinks',
      Hospital: 'Santa Clara - Mater Dei',
      'Médico auxiliar 1': '-',
      'Fornecedor OPME': '-',
      'Status pago': 'Pago',
      Arquivos: '0',
    });
  });

  it('gera nomes de arquivo previsíveis e seguros', () => {
    expect(getPatientExportFileName('xlsx', 'Clínica São José')).toBe(
      'pacientes-clinica-sao-jose-2026-07-30.xlsx',
    );
    expect(getPatientExportFileName('pdf', '---')).toBe('pacientes-empresa-2026-07-30.pdf');
  });

  it('gera um arquivo XLSX no formato ZIP mesmo sem registros', () => {
    const blob = createXlsxBlob([]);

    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(blob.size).toBeGreaterThan(1_000);
  });

  it('faz download e revoga a URL temporária', () => {
    const createObjectURL = vi.fn(() => 'blob:pacientes');
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = createXlsxBlob([]);

    downloadBlob(blob, 'pacientes.xlsx');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pacientes');
    expect(document.querySelector('a[download="pacientes.xlsx"]')).toBeNull();
  });
});
