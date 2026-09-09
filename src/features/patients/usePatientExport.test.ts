import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getPacientes } from '../../services';
import { basePaciente, mockSession, paged } from '../../test/appTestData';
import { emptyPacienteFilters } from './patientUtils';
import { exportPatientList } from './export/patientListExporter';
import { usePatientExport } from './usePatientExport';

vi.mock('../../services', () => ({ getPacientes: vi.fn() }));
vi.mock('./export/patientListExporter', () => ({ exportPatientList: vi.fn(async () => {}) }));

describe('ordenacao da exportacao de pacientes', () => {
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
});
