import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPacientes } from '../../services';
import { basePaciente, mockSession, paged } from '../../test/appTestData';
import { emptyPacienteFilters } from './patientUtils';
import { exportPatientList } from './export/patientListExporter';
import { usePatientExport } from './usePatientExport';

vi.mock('../../services', () => ({ getPacientes: vi.fn() }));
vi.mock('./export/patientListExporter', () => ({ exportPatientList: vi.fn(async () => {}) }));

describe('ordenacao da exportacao de pacientes', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it.each(['asc', 'desc'] as const)('preserva a ordem %s da API entre todas as paginas exportadas', async (sortDirection) => {
    const older = { ...basePaciente, id: 1, dataAtendimento: '2026-12-31', dataAtualizacao: '2026-09-09' };
    const newer = { ...basePaciente, id: 2, dataAtendimento: '2030-12-01', dataAtualizacao: '2026-01-01' };
    const items = sortDirection === 'asc' ? [older, newer] : [newer, older];
    vi.mocked(getPacientes).mockReset()
      .mockResolvedValueOnce({ ...paged([items[0]]), totalPages: 2 })
      .mockResolvedValueOnce({ ...paged([items[1]]), page: 2, totalPages: 2 });
    const { result } = renderHook(() => usePatientExport({
      session: mockSession(), companyName: 'Clinica', paginatedPacientes: [], pacienteFilters: emptyPacienteFilters,
      sortBy: 'dataAtendimento', sortDirection, setPacientesError: vi.fn(),
    }));
    act(() => result.current.setPacienteExportScope('all'));
    await act(async () => { await result.current.handleExportPacientes('pdf'); });
    for (const page of [1, 2]) {
      expect(getPacientes).toHaveBeenNthCalledWith(page, 'jwt-token', expect.objectContaining({
        page, sortBy: 'dataAtendimento', sortDirection,
      }));
    }
    expect(exportPatientList).toHaveBeenLastCalledWith(expect.objectContaining({ items }));
  });

  it.each(['pdf', 'xlsx'] as const)('exporta somente os resultados visíveis em %s e impede chamadas simultâneas', async (format) => {
    const filtered = { ...basePaciente, nomePaciente: 'Resultado filtrado' };
    const { result } = renderHook(() => usePatientExport({
      session: mockSession(), companyName: 'Clinica', paginatedPacientes: [filtered], pacienteFilters: emptyPacienteFilters,
      sortBy: '', sortDirection: 'desc', setPacientesError: vi.fn(),
    }));
    await act(async () => {
      await Promise.all([result.current.handleExportPacientes(format), result.current.handleExportPacientes(format)]);
    });
    expect(exportPatientList).toHaveBeenCalledTimes(1);
    expect(exportPatientList).toHaveBeenCalledWith(expect.objectContaining({ format, items: [filtered], sessionToken: 'jwt-token' }));
    expect(getPacientes).not.toHaveBeenCalled();
    expect(result.current.pacienteExportLoading).toBeNull();
  });

  it('envia filtros combinados e token da clínica no escopo de cirurgiões', async () => {
    vi.mocked(getPacientes).mockResolvedValue(paged([basePaciente]));
    const { result } = renderHook(() => usePatientExport({
      session: { ...mockSession(), token: 'token-clinica-beta' }, companyName: 'Beta', paginatedPacientes: [],
      pacienteFilters: { ...emptyPacienteFilters, medicoUserIds: [1], convenioIds: [7], procedimento: 'Consulta', dataInicio: '01/01/2026', dataFinal: '31/12/2026' },
      sortBy: '', sortDirection: 'desc', setPacientesError: vi.fn(),
    }));
    act(() => result.current.setPacienteExportScope('doctor'));
    await act(async () => result.current.handleExportPacientes('xlsx'));
    expect(getPacientes).toHaveBeenCalledWith('token-clinica-beta', expect.objectContaining({
      medicoUserIds: '1', convenioIds: '7', procedimento: 'Consulta', dataInicio: '2026-01-01', dataFinal: '2026-12-31',
    }));
  });

  it('não consulta nem exporta sem sessão', async () => {
    const { result } = renderHook(() => usePatientExport({
      session: null, companyName: '', paginatedPacientes: [basePaciente], pacienteFilters: emptyPacienteFilters,
      sortBy: '', sortDirection: 'desc', setPacientesError: vi.fn(),
    }));
    await act(async () => result.current.handleExportPacientes('pdf'));
    expect(getPacientes).not.toHaveBeenCalled();
    expect(exportPatientList).not.toHaveBeenCalled();
  });
});
