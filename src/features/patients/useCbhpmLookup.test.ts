import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CBHPM_AUTO_SEARCH_DELAY_MS } from './cbhpmLookupUtils';
import { useCbhpmLookup } from './useCbhpmLookup';

describe('useCbhpmLookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('aplica a busca automatica 3 segundos apos editar codigo ou procedimento', () => {
    const { result } = renderHook(() => useCbhpmLookup());

    act(() => {
      result.current.setCbhpmFilters({
        codigo: '407',
        procedimento: 'tumor',
        porte: '2b',
      });
    });

    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '',
      procedimento: '',
      porte: '',
    });

    act(() => {
      vi.advanceTimersByTime(CBHPM_AUTO_SEARCH_DELAY_MS - 1);
    });

    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '',
      procedimento: '',
      porte: '',
    });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '407',
      procedimento: 'tumor',
      porte: '2B',
    });
  });

  it('nao dispara nova busca automatica quando apenas o porte muda', () => {
    const { result } = renderHook(() => useCbhpmLookup());

    act(() => {
      result.current.setCbhpmFilters({
        codigo: '407',
        procedimento: 'tumor',
        porte: '2b',
      });
    });

    act(() => {
      vi.advanceTimersByTime(CBHPM_AUTO_SEARCH_DELAY_MS);
    });

    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '407',
      procedimento: 'tumor',
      porte: '2B',
    });

    act(() => {
      result.current.setCbhpmFilters({
        codigo: '407',
        procedimento: 'tumor',
        porte: '3a',
      });
    });

    act(() => {
      vi.advanceTimersByTime(CBHPM_AUTO_SEARCH_DELAY_MS);
    });

    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '407',
      procedimento: 'tumor',
      porte: '2B',
    });

    act(() => {
      result.current.applyCbhpmFiltersNow();
    });

    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '407',
      procedimento: 'tumor',
      porte: '3A',
    });
  });

  it('cancela o debounce pendente quando a consulta manual e aplicada antes do prazo', () => {
    const { result } = renderHook(() => useCbhpmLookup());

    act(() => {
      result.current.setCbhpmCurrentPage(5);
      result.current.setCbhpmFilters({
        codigo: '407',
        procedimento: '',
        porte: '',
      });
    });

    act(() => {
      result.current.applyCbhpmFiltersNow();
    });

    expect(result.current.cbhpmCurrentPage).toBe(1);

    act(() => {
      result.current.setCbhpmCurrentPage(2);
      vi.advanceTimersByTime(CBHPM_AUTO_SEARCH_DELAY_MS);
    });

    expect(result.current.cbhpmCurrentPage).toBe(2);
    expect(result.current.appliedCbhpmFilters).toEqual({
      codigo: '407',
      procedimento: '',
      porte: '',
    });
  });
});
