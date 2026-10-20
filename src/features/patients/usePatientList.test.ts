import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPacienteFilterQuery } from './patientUtils';
import { usePatientList } from './usePatientList';

describe('issue173: filtro de tipo na consulta de pacientes', () => {
  afterEach(() => vi.useRealTimers());

  it('aplica somente a mudança de tipo após debounce e volta à primeira página', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePatientList());
    act(() => {
      result.current.setPacienteCurrentPage(3);
      result.current.setPacienteFilters((current) => ({ ...current, tipoCirurgia: 'Urgencia' }));
    });
    expect(getPacienteFilterQuery(result.current.debouncedPacienteFilters)).not.toHaveProperty('tipoCirurgia');
    act(() => vi.advanceTimersByTime(300));
    expect(getPacienteFilterQuery(result.current.debouncedPacienteFilters)).toMatchObject({ tipoCirurgia: 'Urgencia' });
    expect(result.current.pacienteCurrentPage).toBe(1);

    act(() => result.current.setPacienteFilters((current) => ({ ...current, tipoCirurgia: 'Eletiva' })));
    act(() => vi.advanceTimersByTime(300));
    expect(getPacienteFilterQuery(result.current.debouncedPacienteFilters)).toMatchObject({ tipoCirurgia: 'Eletiva' });

    act(() => result.current.setPacienteFilters((current) => ({ ...current, tipoCirurgia: '' })));
    act(() => vi.advanceTimersByTime(300));
    expect(getPacienteFilterQuery(result.current.debouncedPacienteFilters)).not.toHaveProperty('tipoCirurgia');
  });
});
