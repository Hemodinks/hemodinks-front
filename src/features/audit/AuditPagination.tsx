import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useId } from 'react';
import { IconButton } from '../../shared/components/ui';

export const AUDIT_PAGE_SIZES = [10, 20, 50] as const;

type AuditPaginationProps = {
  label: string;
  page: number;
  pageSize: number;
  totalItems: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

// Paginação da trilha (ficha do paciente e tela geral): faixa exibida, primeira/anterior/próxima/última e tamanho.
export function AuditPagination({ label, page, pageSize, totalItems, busy, onPageChange, onPageSizeChange }: AuditPaginationProps) {
  const sizeId = useId();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  const goTo = (next: number) => onPageChange(Math.min(totalPages, Math.max(1, next)));

  return (
    <div className="pagination-bar audit-pagination" role="group" aria-label={`Paginação: ${label}`}>
      <span role="status">{start}-{end} de {totalItems}</span>
      <label className="audit-page-size" htmlFor={sizeId}>
        Por página
        <select id={sizeId} value={pageSize} disabled={busy} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {AUDIT_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <div className="pagination-actions">
        <IconButton label="Primeira página" title="Primeira página" disabled={busy || page <= 1} onClick={() => goTo(1)}>
          <ChevronsLeft size={18} />
        </IconButton>
        <IconButton label="Página anterior" title="Página anterior" disabled={busy || page <= 1} onClick={() => goTo(page - 1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <span className="page-indicator">Página {page} de {totalPages}</span>
        <IconButton label="Próxima página" title="Próxima página" disabled={busy || page >= totalPages} onClick={() => goTo(page + 1)}>
          <ChevronRight size={18} />
        </IconButton>
        <IconButton label="Última página" title="Última página" disabled={busy || page >= totalPages} onClick={() => goTo(totalPages)}>
          <ChevronsRight size={18} />
        </IconButton>
      </div>
    </div>
  );
}
