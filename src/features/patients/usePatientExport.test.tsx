import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as services from '../../services';
import { basePaciente, mockSession, paged } from '../../test/appTestData';
import * as exportUtils from './patientExport';
import { usePatientExport } from './usePatientExport';

const pdfSave = vi.fn();
const pdfText = vi.fn();
const pdfSetFontSize = vi.fn();
const autoTable = vi.fn();

vi.mock('../../services', () => ({ getPacientes: vi.fn() }));
vi.mock('./patientExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./patientExport')>();
  return {
    ...actual,
    createXlsxBlob: vi.fn(() => new Blob(['xlsx'])),
    downloadBlob: vi.fn(),
  };
});
vi.mock('jspdf', () => ({
  jsPDF: class {
    save = pdfSave;
    text = pdfText;
    setFontSize = pdfSetFontSize;
  },
}));
vi.mock('jspdf-autotable', () => ({ default: autoTable }));

const filters = {
  paciente: '',
  medico: '',
  convenio: '',
  procedimento: '',
};

function renderExport(overrides: Partial<Parameters<typeof usePatientExport>[0]> = {}) {
  const setPacientesError = vi.fn();
  const options: Parameters<typeof usePatientExport>[0] = {
    session: mockSession(),
    companyName: 'Clínica Teste',
    paginatedPacientes: [basePaciente],
    pacienteFilters: filters,
    setPacientesError,
    ...overrides,
  };
  return { ...renderHook(() => usePatientExport(options)), setPacientesError };
}

describe('usePatientExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exporta os pacientes visíveis em XLSX', async () => {
    const { result } = renderExport();
    await act(() => result.current.handleExportPacientes('xlsx'));
    expect(exportUtils.createXlsxBlob).toHaveBeenCalled();
    expect(exportUtils.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/\.xlsx$/),
    );
    expect(result.current.pacienteExportLoading).toBeNull();
  });

  it('exige médico e percorre todas as páginas no escopo selecionado', async () => {
    const { result, setPacientesError } = renderExport();
    act(() => result.current.setPacienteExportScope('doctor'));
    await act(() => result.current.handleExportPacientes('xlsx'));
    expect(setPacientesError).toHaveBeenCalledWith(
      'Selecione um cirurgião antes de exportar por cirurgião.',
    );

    vi.mocked(services.getPacientes)
      .mockResolvedValueOnce(paged([basePaciente], 1, 100, 101))
      .mockResolvedValueOnce(paged([{ ...basePaciente, id: 11 }], 2, 100, 101));
    const doctor = renderExport({ pacienteFilters: { ...filters, medico: ' Dra. Ana ' } });
    act(() => doctor.result.current.setPacienteExportScope('doctor'));
    await act(() => doctor.result.current.handleExportPacientes('xlsx'));
    expect(services.getPacientes).toHaveBeenNthCalledWith(1, 'jwt-token', {
      page: 1,
      pageSize: 100,
      medico: 'Dra. Ana',
    });
    expect(services.getPacientes).toHaveBeenNthCalledWith(2, 'jwt-token', {
      medico: 'Dra. Ana',
      page: 2,
      pageSize: 100,
    });
  });

  it('gera PDF e ignora solicitações sem sessão', async () => {
    const { result } = renderExport();
    act(() => result.current.setPacienteExportScope('all'));
    vi.mocked(services.getPacientes).mockResolvedValue(paged([basePaciente]));
    await act(() => result.current.handleExportPacientes('pdf'));
    await waitFor(() => expect(pdfSave).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/)));
    expect(autoTable).toHaveBeenCalled();

    const noSession = renderExport({ session: null });
    await act(() => noSession.result.current.handleExportPacientes('xlsx'));
    expect(exportUtils.downloadBlob).toHaveBeenCalledTimes(0);
  });

  it('apresenta falha da consulta sem rejeitar a interação', async () => {
    vi.mocked(services.getPacientes).mockRejectedValue(new Error('Exportação indisponível'));
    const { result, setPacientesError } = renderExport();
    act(() => result.current.setPacienteExportScope('all'));
    await act(() => result.current.handleExportPacientes('xlsx'));
    expect(setPacientesError).toHaveBeenCalledWith('Exportação indisponível');
  });
});
