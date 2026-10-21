import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPacienteObservacoes } from '../../services';
import { advanceSessionEpoch } from '../../services/sessionEpoch';
import { emptyPacienteForm } from './patientUtils';
import { exportPatientForm } from './export/patientFormExporter';
import { usePatientFormExport } from './usePatientFormExport';

vi.mock('../../services', () => ({ getPacienteObservacoes: vi.fn() }));
vi.mock('./export/patientFormExporter', () => ({ exportPatientForm: vi.fn().mockResolvedValue(undefined) }));

describe('isolamento da exportação da ficha', () => {
  beforeEach(() => vi.clearAllMocks());
  it('não exporta dados de A após observações pendentes falharem na troca de sessão', async () => {
    let fail!: (reason: Error) => void;
    vi.mocked(getPacienteObservacoes).mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    const { result } = renderHook(() => usePatientFormExport({ editingPacienteId: 10, sessionToken: 'a',
      pacienteFormData: { ...emptyPacienteForm, nomePaciente: 'Paciente A' }, companyName: 'A' }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleExport('pdf'); });
    advanceSessionEpoch();
    await act(async () => { fail(new Error('A sessão foi alterada.')); await pending; });
    expect(exportPatientForm).not.toHaveBeenCalled();
  });

  it('preserva exportação sem observações quando a sessão permanece atual', async () => {
    vi.mocked(getPacienteObservacoes).mockRejectedValueOnce(new Error('Indisponível'));
    const { result } = renderHook(() => usePatientFormExport({ editingPacienteId: 10, sessionToken: 'a',
      pacienteFormData: emptyPacienteForm, companyName: 'A' }));
    await act(async () => result.current.handleExport('pdf'));
    expect(exportPatientForm).toHaveBeenCalledOnce();
  });
});
