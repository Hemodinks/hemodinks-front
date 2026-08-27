import type { ReactNode } from 'react';

type SortableTableHeaderProps<Field extends string> = {
  field: Field;
  label: ReactNode;
  activeField: string;
  direction: 'asc' | 'desc';
  onSortChange: (field: Field) => void;
};

export function SortableTableHeader<Field extends string>({
  field,
  label,
  activeField,
  direction,
  onSortChange,
}: SortableTableHeaderProps<Field>) {
  const active = activeField === field;

  return (
    <th aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-header-button" onClick={() => onSortChange(field)}>
        {label}
        {active && <span className="sort-indicator">{direction === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}
