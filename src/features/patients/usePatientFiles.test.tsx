import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as services from '../../services';
import { basePaciente, mockSession } from '../../test/appTestData';
import type { usePatientForm } from './usePatientForm';
import { usePatientFiles } from './usePatientFiles';

vi.mock('../../services', () => ({ deletePacienteArquivo: vi.fn(), getPaciente: vi.fn() }));

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
}

function createPatientForm() {
  return {
    setPacienteFormError: vi.fn(),
    setPendingPatientFiles: vi.fn(),
    setEditingPacienteDetails: vi.fn(),
  } as unknown as ReturnType<typeof usePatientForm>;
}

function fileEvent(files: File[]) {
  return { target: { files, value: 'selected' } } as unknown as ChangeEvent<HTMLInputElement>;
}

function renderFiles(overrides: Partial<Parameters<typeof usePatientFiles>[0]> = {}) {
  const patientForm = createPatientForm();
  const options: Parameters<typeof usePatientFiles>[0] = {
    session: mockSession(),
    patientReadOnly: false,
    canEditPatients: true,
    patientForm,
    setPacientesError: vi.fn(),
    loadPacientes: vi.fn().mockResolvedValue(undefined),
    loadDashboardSummary: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { ...renderHook(() => usePatientFiles(options), { wrapper }), patientForm, options };
}

describe('usePatientFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testQueryClient.clear();
  });

  it('valida, adiciona e remove arquivos pendentes', () => {
    const { result, patientForm } = renderFiles();
    act(() => result.current.handleFilesChange(fileEvent([])));
    act(() =>
      result.current.handleFilesChange(
        fileEvent([new File(['x'], 'malware.exe', { type: 'application/octet-stream' })]),
      ),
    );
    expect(patientForm.setPacienteFormError).toHaveBeenCalledWith(expect.stringContaining('Use'));

    act(() =>
      result.current.handleFilesChange(
        fileEvent([new File(['laudo'], 'laudo.pdf', { type: 'application/pdf' })]),
      ),
    );
    expect(patientForm.setPendingPatientFiles).toHaveBeenCalled();
    act(() => result.current.removePendingFile(0));

    const readOnly = renderFiles({ patientReadOnly: true });
    act(() =>
      readOnly.result.current.handleFilesChange(
        fileEvent([new File(['x'], 'laudo.pdf', { type: 'application/pdf' })]),
      ),
    );
    expect(readOnly.patientForm.setPendingPatientFiles).not.toHaveBeenCalled();
  });

  it('exclui arquivo, atualiza detalhes e invalida as consultas relacionadas', async () => {
    vi.mocked(services.deletePacienteArquivo).mockResolvedValue(undefined);
    vi.mocked(services.getPaciente).mockResolvedValue(basePaciente);
    const { result, patientForm, options } = renderFiles();

    await act(() => result.current.deleteFile(basePaciente, 7));
    expect(services.deletePacienteArquivo).toHaveBeenCalledWith(basePaciente.id, 7, 'jwt-token');
    expect(patientForm.setEditingPacienteDetails).toHaveBeenCalledWith(basePaciente);
    expect(options.loadPacientes).toHaveBeenCalledWith('jwt-token', true);
    expect(options.loadDashboardSummary).toHaveBeenCalledWith('jwt-token', true);
  });

  it('protege exclusão sem sessão ou permissão e apresenta erros', async () => {
    const noPermission = renderFiles({ canEditPatients: false });
    await act(() => noPermission.result.current.deleteFile(basePaciente, 1));
    expect(noPermission.options.setPacientesError).toHaveBeenCalledWith(
      'Sem permissao para excluir arquivo do paciente.',
    );

    vi.mocked(services.deletePacienteArquivo).mockRejectedValue(new Error('Falha ao excluir'));
    const failed = renderFiles();
    await act(() => failed.result.current.deleteFile(basePaciente, 1));
    expect(failed.options.setPacientesError).toHaveBeenCalledWith('Falha ao excluir');

    const noSession = renderFiles({ session: null });
    await act(() => noSession.result.current.deleteFile(basePaciente, 1));
  });

  it('abre, atualiza, fecha e reseta o modal de arquivos', async () => {
    const patientWithFile = { ...basePaciente, arquivosCount: 1 };
    vi.mocked(services.getPaciente).mockResolvedValue(patientWithFile);
    const { result } = renderFiles();

    await act(() => result.current.openFiles(basePaciente));
    expect(services.getPaciente).not.toHaveBeenCalled();
    await act(() => result.current.openFiles(patientWithFile));
    expect(result.current.selectedPatientFiles).toEqual(patientWithFile);

    act(() => result.current.closeFilesModal());
    expect(result.current.selectedPatientFiles).toBeNull();

    vi.mocked(services.getPaciente).mockRejectedValue(new Error('Falha ao carregar'));
    await act(() => result.current.openFiles(patientWithFile));
    await waitFor(() => expect(result.current.patientFilesModalError).toBe('Falha ao carregar'));
    act(() => result.current.reset());
    expect(result.current.patientFilesModalError).toBe('');
  });
});
