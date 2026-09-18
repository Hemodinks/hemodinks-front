import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyPacienteForm, withPrimaryProcedimento } from './patientUtils';
import { usePatientProcedureActions } from './usePatientProcedureActions';

describe('remoção de procedimentos', () => {
  it('atualiza o procedimento principal e permite remover o último sem restaurar o valor anterior', () => {
    const { result } = renderHook(() => {
      const [formData, setFormData] = useState(withPrimaryProcedimento({
        ...emptyPacienteForm,
        procedimentos: [
          { cbhpmCodigo: '101', cbhpmPorte: '2B', procedimento: 'Consulta', valorReferencia: 120 },
          { cbhpmCodigo: '202', cbhpmPorte: '3B', procedimento: 'Retorno', valorReferencia: 80 },
        ],
      }));
      const actions = usePatientProcedureActions({ readOnly: false, canEdit: true, setFormData,
        setFormError: vi.fn(), setModalOpen: vi.fn(), setLookupError: vi.fn() });
      return { formData, ...actions };
    });
    act(() => result.current.handleRemovePacienteProcedimento(0));
    expect(result.current.formData.procedimento).toBe('Retorno');
    expect(result.current.formData.cbhpmCodigo).toBe('202');
    act(() => result.current.handleRemovePacienteProcedimento(0));
    expect(result.current.formData.procedimentos).toEqual([]);
    expect(result.current.formData.procedimento).toBe('');
    expect(result.current.formData.cbhpmCodigo).toBe('');
    expect(result.current.formData.cbhpmPorte).toBe('');
  });
});
