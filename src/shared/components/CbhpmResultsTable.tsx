import { CheckCircle2 } from 'lucide-react';
import type { CbhpmResult } from '../domain/medicalContracts';
import { formatCurrency } from '../utils/formatters';
import { Button } from './ui';
import { Pagination, SortableHeader, TableStateRow } from './listing';
import { useSortableData } from '../hooks/useSortableData';

type CbhpmResultsTableProps = {
  items: CbhpmResult[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onSelect: (item: CbhpmResult) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
  formatCode?: (code: string) => string;
  wrapClassName?: string;
  tableClassName?: string;
  paginationClassName?: string;
  selectClassName?: string;
};

const columns = [
  { field: 'codigo', label: 'Código' },
  { field: 'procedimento', label: 'Procedimento' },
  { field: 'porte', label: 'Porte' },
  { field: 'valorreferencia', label: 'Valor referência' },
] as const;

export function CbhpmResultsTable({
  items,
  loading,
  currentPage,
  totalPages,
  totalItems,
  visibleStart,
  visibleEnd,
  onPageChange,
  onSelect,
  sortBy = '',
  sortDirection = 'asc',
  onSortChange,
  formatCode = (code) => code,
  wrapClassName = '',
  tableClassName = '',
  paginationClassName = '',
  selectClassName = '',
}: CbhpmResultsTableProps) {
  const localSorting = useSortableData(items, {
    codigo: (item) => item.codigo,
    procedimento: (item) => item.procedimento,
    porte: (item) => item.porte,
    valorreferencia: (item) => item.valorReferencia,
  });
  const effectiveSortBy = onSortChange ? sortBy : localSorting.sortBy;
  const effectiveSortDirection = onSortChange ? sortDirection : localSorting.sortDirection;
  const effectiveSortChange = onSortChange ?? localSorting.handleSortChange;
  const visibleItems = onSortChange ? items : localSorting.sortedItems;

  return (
    <>
      <div className={`table-wrap ${wrapClassName}`.trim()}>
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((column) => (
                <SortableHeader
                  key={column.field}
                  field={column.field}
                  label={column.label}
                  sortBy={effectiveSortBy}
                  sortDirection={effectiveSortDirection}
                  onSortChange={effectiveSortChange}
                />
              ))}
              <th aria-label="Selecionar procedimento" />
            </tr>
          </thead>
          <tbody>
            <TableStateRow
              colSpan={5}
              loading={loading}
              empty={!items.length}
              loadingLabel="Carregando procedimentos..."
              emptyLabel="Nenhum procedimento encontrado."
            />
            {!loading &&
              visibleItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="Código">{formatCode(item.codigo) || item.codigo}</td>
                  <td data-label="Procedimento">{item.procedimento}</td>
                  <td data-label="Porte">{item.porte || '-'}</td>
                  <td data-label="Valor referência">
                    {item.valorReferencia == null ? '-' : formatCurrency(item.valorReferencia)}
                  </td>
                  <td data-label="Selecionar">
                    <Button className={selectClassName} onClick={() => onSelect(item)}>
                      <CheckCircle2 size={17} />
                      Adicionar
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination
        entityLabel="procedimentos"
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        disabled={loading}
        className={paginationClassName}
        previousLabel="Página anterior"
        nextLabel="Próxima página"
      />
    </>
  );
}
