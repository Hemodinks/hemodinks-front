import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSortableData } from './useSortableData';

const items = [
  { name: 'Registro 10', amount: 20 },
  { name: 'Registro 2', amount: 100 },
  { name: 'Registro 1', amount: 50 },
];

describe('useSortableData', () => {
  it('alterna a ordenação textual entre ascendente e descendente', () => {
    const { result } = renderHook(() =>
      useSortableData(items, {
        name: (item) => item.name,
        amount: (item) => item.amount,
      }),
    );

    act(() => result.current.handleSortChange('name'));
    expect(result.current.sortedItems.map((item) => item.name)).toEqual([
      'Registro 1',
      'Registro 2',
      'Registro 10',
    ]);
    expect(result.current.sortDirection).toBe('asc');

    act(() => result.current.handleSortChange('name'));
    expect(result.current.sortedItems.map((item) => item.name)).toEqual([
      'Registro 10',
      'Registro 2',
      'Registro 1',
    ]);
    expect(result.current.sortDirection).toBe('desc');
  });

  it('compara colunas numéricas pelo valor, não pelo texto formatado', () => {
    const { result } = renderHook(() =>
      useSortableData(items, {
        amount: (item) => item.amount,
      }),
    );

    act(() => result.current.handleSortChange('amount'));

    expect(result.current.sortedItems.map((item) => item.amount)).toEqual([20, 50, 100]);
  });
});
