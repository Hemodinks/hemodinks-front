import { CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import type { CbhpmGeral } from '../../types';
import type { CbhpmFilters } from '../../appTypes';
import { formatCurrency } from '../../shared/utils/formatters';

type CbhpmLookupModalProps = {
  items: CbhpmGeral[];
  filters: CbhpmFilters;
  loading: boolean;
  error: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  visibleStart: number;
  visibleEnd: number;
  onFiltersChange: (filters: CbhpmFilters) => void;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onRefresh: () => void;
  onSelect: (procedimento: CbhpmGeral) => void;
  onClose: () => void;
};

export function CbhpmLookupModal({
  items,
  filters,
  loading,
  error,
  currentPage,
  totalPages,
  totalItems,
  visibleStart,
  visibleEnd,
  onFiltersChange,
  onPageChange,
  onRefresh,
  onSelect,
  onClose,
}: CbhpmLookupModalProps) {
  const updateFilter = (field: keyof CbhpmFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel cbhpm-modal" role="dialog" aria-modal="true" aria-labelledby="cbhpm-title">
        <div className="panel-title">
          <div>
            <span className="eyebrow">CBHPM</span>
            <h2 id="cbhpm-title">Selecionar procedimento</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="cbhpm-filters">
          <label>
            Codigo
            <input
              type="search"
              value={filters.codigo}
              onChange={(event) => updateFilter('codigo', event.target.value)}
              placeholder="1.01"
            />
          </label>
          <label>
            Procedimento
            <input
              type="search"
              value={filters.procedimento}
              onChange={(event) => updateFilter('procedimento', event.target.value)}
              placeholder="Consulta"
            />
          </label>
          <label>
            Porte
            <input
              type="search"
              value={filters.porte}
              onChange={(event) => updateFilter('porte', event.target.value.toUpperCase())}
              placeholder="2B"
              maxLength={10}
            />
          </label>
          <button type="button" className="icon-button" onClick={onRefresh} title="Atualizar procedimentos">
            <RefreshCw size={18} />
          </button>
        </div>

        {error && <p className="alert error">{error}</p>}

        <div className="table-wrap cbhpm-table-wrap">
          <table className="cbhpm-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Procedimento</th>
                <th>Porte</th>
                <th>Valor referencia</th>
                <th aria-label="Selecionar" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty-row">Carregando procedimentos...</td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Codigo">{item.codigo}</td>
                    <td data-label="Procedimento">{item.procedimento}</td>
                    <td data-label="Porte">{item.porte || '-'}</td>
                    <td data-label="Valor referencia">{formatCurrency(item.valorReferencia)}</td>
                    <td data-label="Selecionar">
                      <button type="button" className="ghost-button select-procedure-action" onClick={() => onSelect(item)}>
                        <CheckCircle2 size={17} />
                        Adicionar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">Nenhum procedimento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar cbhpm-pagination">
          <span>
            {visibleStart}-{visibleEnd} de {totalItems}
          </span>
          <div className="pagination-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => onPageChange((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              title="Pagina anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="page-indicator">Pagina {currentPage} de {totalPages}</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              title="Proxima pagina"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
