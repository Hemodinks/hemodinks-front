import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SortValue = string | number | boolean | Date | null | undefined;
export type SortAccessors<T> = Record<string, (item: T) => SortValue>;

const collator = new Intl.Collator('pt-BR', {
  sensitivity: 'base',
  numeric: true,
});

function compareValues(first: SortValue, second: SortValue) {
  const normalizedFirst = first instanceof Date ? first.getTime() : first;
  const normalizedSecond = second instanceof Date ? second.getTime() : second;

  if (normalizedFirst == null && normalizedSecond == null) return 0;
  if (normalizedFirst == null) return -1;
  if (normalizedSecond == null) return 1;
  if (typeof normalizedFirst === 'number' && typeof normalizedSecond === 'number') {
    return normalizedFirst - normalizedSecond;
  }
  if (typeof normalizedFirst === 'boolean' && typeof normalizedSecond === 'boolean') {
    return Number(normalizedFirst) - Number(normalizedSecond);
  }

  return collator.compare(String(normalizedFirst), String(normalizedSecond));
}

export function useSortableData<T>(
  items: T[],
  accessors: SortAccessors<T>,
  initialSortBy = '',
  initialSortDirection: SortDirection = 'asc',
) {
  const [sorting, setSorting] = useState({
    sortBy: initialSortBy,
    sortDirection: initialSortDirection,
  });

  const handleSortChange = useCallback((field: string) => {
    setSorting((current) => ({
      sortBy: field,
      sortDirection: current.sortBy === field && current.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const sortedItems = useMemo(() => {
    const accessor = accessors[sorting.sortBy];
    if (!accessor) return items;
    const direction = sorting.sortDirection === 'asc' ? 1 : -1;

    return [...items].sort(
      (first, second) => compareValues(accessor(first), accessor(second)) * direction,
    );
  }, [accessors, items, sorting.sortBy, sorting.sortDirection]);

  return {
    sortedItems,
    sortBy: sorting.sortBy,
    sortDirection: sorting.sortDirection,
    handleSortChange,
  };
}
