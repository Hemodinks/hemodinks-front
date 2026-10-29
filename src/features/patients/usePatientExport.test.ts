import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPacientes } from '../../services';
import { basePaciente, mockSession, paged } from '../../test/appTestData';
import { emptyPacienteFilters } from './patientUtils';
import { exportPatientList } from './export/patientListExporter';
import { usePatientExport } from './usePatientExport';
import { advanceSessionEpoch } from '../../services/sessionEpoch';

vi.mock('../../services', () => ({ getPacientes: vi.fn() }));
vi.mock('./export/patientListExporter', () => ({ exportPatientList: vi.fn(async () => {}) }));

describe('ordenacao da exportacao de pacientes', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it.each(['all', 'doctor', 'visible'] as const)('preserva o tipo de cirurgia no escopo %s', async (scope) => {
    const urgent = { ...basePaciente, tipoCirurgia: 'Urgencia' as const };
    vi.mocked(getPacientes).mockReset().mockResolvedValue(paged([urgent]));
    const { result } = renderHook(() => usePatientExport({
      session: mockSession(), companyName: 'Clinica', paginatedPacientes: [urgent],
      pacienteFilters: { ...emptyPacienteFilters, medicoUserIds: [1], tipoCirurgia: 'Urgencia' },
      sortBy: '', sortDirection: 'desc', setPacientesError: vi.fn(),
    }));
    act(() => result.current.setPacienteExportScope(scope));
    await act(async () => result.current.handleExportPacientes('xlsx'));
    if (scope !== 'visible') expect(getPacientes).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ tipoCirurgia: 'Urgencia' }));
    expect(exportPatientList).toHaveBeenCalledWith(expect.objectContaining({ items: [urgent], contextLines: expect.arrayContaining(['Tipo de cirurgia: Urgência']) }));
  });
  it('interrompe paginação e exportação quando muda a sessão durante a primeira página', async () => {
    let complete!: (value: ReturnType<typeof paged<typeof basePaciente>>) => void;
    vi.mocked(getPacientes).mockReset().mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    const { result } = renderHook(() => usePatientExport({
      session: mockSession(), companyName: 'A', paginatedPacientes: [], pacienteFilters: emptyPacienteFilters,
      sortBy: '', sortDirection: 'desc', setPacientesError: vi.fn(),
    }));
    act(() => result.current.setPacienteExportScope('all'));
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleExportPacientes('xlsx'); });
    advanceSessionEpoch();
    await act(async () => { complete({ ...paged([basePaciente]), totalPages: 2 }); await pending; });
    expect(getPacientes).toHaveBeenCalledTimes(1);
    expect(exportPatientList).not.toHaveBeenCalled();
  });

  it.each(['filter', 'sort', 'scope', 'unmount'] as const)('cancela coleta atrasada após mudança de %s na mesma sessão', async change => {
    let finish!: (value: ReturnType<typeof paged<typeof basePaciente>>) => void;
    vi.mocked(getPacientes).mockReset().mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const session = mockSession();
    const { result, rerender, unmount } = renderHook(({ filters, sort }) => usePatientExport({
      session, companyName: 'Clínica A', paginatedPacientes: [], pacienteFilters: filters,
      sortBy: sort, sortDirection: 'desc', setPacientesError: vi.fn(),
    }), { initialProps: { filters: emptyPacienteFilters, sort: 'data' } });
    act(() => result.current.setPacienteExportScope('all'));
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleExportPacientes('xlsx'); });
    if (change === 'unmount') unmount();
    else if (change === 'scope') act(() => result.current.setPacienteExportScope('visible'));
    else rerender({ filters: change === 'filter' ? { ...emptyPacienteFilters, procedimento: 'Outro' } : emptyPacienteFilters,
      sort: change === 'sort' ? 'nome' : 'data' });
    await act(async () => { finish(paged([basePaciente])); await pending; });
    expect(exportPatientList).not.toHaveBeenCalled();
    expect(getPacientes).toHaveBeenCalledTimes(1);
  });
  it.each(['asc', 'desc'] as const)('preserva a ordem %s da API entre todas as paginas exportadas', async (sortDirection) => {
    const older = { ...basePaciente, id: 1, dataAtendimento: '2026-12-31', dataAtualizacao: '2026-09-09' };
    const newer = { ...basePaciente, id: 2, dataAtendimento: '2030-12-01', dataAtualizacao: '2026-01-01' };
    const items = sortDirection === 'asc' ? [older, newer] : [newer, older];
    vi.mocked(getPacientes).mockReset()
      .mockResolvedValueOnce(paged([items[0]], 1, 1, 2))
      .mockResolvedValueOnce(paged([items[1]], 2, 1, 2));
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
