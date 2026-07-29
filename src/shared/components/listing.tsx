import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { scrollListCarousel } from '../utils/carousel';
import { IconButton } from './ui';

type ListToolbarProps = {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
};

export function ListToolbar({ eyebrow, title, children }: ListToolbarProps) {
  return (
    <div className="data-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="table-tools">{children}</div>
    </div>
  );
}

type SortableHeaderProps = {
  field: string;
  label: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string) => void;
};

export function SortableHeader({
  field,
  label,
  sortBy,
  sortDirection,
  onSortChange,
}: SortableHeaderProps) {
  const active = sortBy === field;
  return (
    <th>
      <button
        type="button"
        className="sort-header-button"
        onClick={() => onSortChange(field)}
        aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        {active && (
          <span className="sort-indicator" aria-hidden="true">
            {sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </button>
    </th>
  );
}

type TableStateRowProps = {
  colSpan: number;
  loading: boolean;
  empty: boolean;
  loadingLabel: string;
  emptyLabel: string;
};

export function TableStateRow({
  colSpan,
  loading,
  empty,
  loadingLabel,
  emptyLabel,
}: TableStateRowProps) {
  if (!loading && !empty) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="empty-row">
        {loading ? loadingLabel : emptyLabel}
      </td>
    </tr>
  );
}

type HorizontalTableScrollerProps = {
  entityLabel: string;
  className?: string;
  children: ReactNode;
};

export function HorizontalTableScroller({
  entityLabel,
  className = '',
  children,
}: HorizontalTableScrollerProps) {
  return (
    <div className="carousel-shell">
      <button
        type="button"
        className="carousel-nav carousel-nav-left"
        onClick={(event) => scrollListCarousel(event, 'previous')}
        aria-label={`Voltar no carrossel de ${entityLabel}`}
        title="Voltar no carrossel"
      >
        <ChevronLeft size={20} />
      </button>
      <div className={`table-wrap list-carousel-wrap ${className}`.trim()}>{children}</div>
      <button
        type="button"
        className="carousel-nav carousel-nav-right"
        onClick={(event) => scrollListCarousel(event, 'next')}
        aria-label={`Avançar no carrossel de ${entityLabel}`}
        title="Avançar no carrossel"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

type PaginationProps = {
  entityLabel: string;
  visibleStart: number;
  visibleEnd: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number | ((current: number) => number)) => void;
  disabled?: boolean;
  className?: string;
  previousLabel?: string;
  nextLabel?: string;
};

export function Pagination({
  entityLabel,
  visibleStart,
  visibleEnd,
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className = '',
  previousLabel = `Página anterior de ${entityLabel}`,
  nextLabel = `Próxima página de ${entityLabel}`,
}: PaginationProps) {
  return (
    <div className={`pagination-bar ${className}`.trim()}>
      <span>
        {visibleStart}-{visibleEnd} de {totalItems}
      </span>
      <div className="pagination-actions">
        <IconButton
          label={previousLabel}
          onClick={() => onPageChange((page) => Math.max(1, page - 1))}
          disabled={disabled || currentPage === 1}
          title="Página anterior"
        >
          <ChevronLeft size={18} />
        </IconButton>
        <span className="page-indicator">
          Página {currentPage} de {totalPages}
        </span>
        <IconButton
          label={nextLabel}
          onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
          disabled={disabled || currentPage === totalPages}
          title="Próxima página"
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </div>
  );
}
