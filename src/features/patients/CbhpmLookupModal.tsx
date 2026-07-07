import { type Dispatch, type SetStateAction, memo, useCallback, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, RefreshCw, X } from 'lucide-react';
import type { CbhpmGeral } from '../../types';
import type { CbhpmFilters } from '../../appTypes';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { normalizeCbhpmCodigo } from './patientUtils';
import './patients.css';

type CbhpmLookupModalProps = {
  items: CbhpmGeral[];
  filters: CbhpmFilters;
  isAdmin: boolean;
  canConsult: boolean;
  loading: boolean;
  error: string;
  canSearch: boolean;
  filterHint: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  visibleStart: number;
  visibleEnd: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onFiltersChange: Dispatch<SetStateAction<CbhpmFilters>>;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onSortChange: (field: string) => void;
  onRefresh: () => void;
  onSelect: (procedimento: CbhpmGeral) => void;
  onClose: () => void;
};

export const CbhpmLookupModal = memo(function CbhpmLookupModalContent({
  items,
  filters,
  canConsult,
  loading,
  error,
  canSearch,
  filterHint,
  currentPage,
  totalPages,
  totalItems,
  visibleStart,
  visibleEnd,
  sortBy,
  sortDirection,
  onFiltersChange,
  onPageChange,
  onSortChange,
  onRefresh,
  onSelect,
  onClose,
}: CbhpmLookupModalProps) {
  const [manualValidationError, setManualValidationError] = useState('');
  const shouldShowFilterHint = Boolean(filterHint && filterHint !== error);

  const manualValues = useMemo(() => ({
    codigo: normalizeCbhpmCodigo(filters.codigo),
    procedimento: filters.procedimento.trim(),
    porte: filters.porte.trim().toUpperCase(),
  }), [filters.codigo, filters.procedimento, filters.porte]);

  const canAddManual = Boolean(manualValues.procedimento);

  const updateFilter = useCallback((field: keyof CbhpmFilters, value: string) => {
    setManualValidationError('');
    onFiltersChange((current) => ({
      ...current,
      [field]: value,
    }));
  }, [onFiltersChange]);

  const handleAddManual = useCallback(() => {
    if (!manualValues.procedimento) {
      setManualValidationError('Informe a descrição do procedimento para cadastrar manualmente.');
      return;
    }

    if (!canAddManual) {
      return;
    }

    onSelect({
      id: 0,
      codigo: manualValues.codigo,
      procedimento: manualValues.procedimento,
      porte: manualValues.porte || null,
      valorReferencia: null,
    });
  }, [canAddManual, manualValues, onSelect]);

  return (
    <Modal titleId="cbhpm-title" className="cbhpm-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">CBHPM</span>
            <h2 id="cbhpm-title">Selecionar procedimento</h2>
          </div>
          <IconButton label="Fechar seleção de procedimento" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="cbhpm-filters">
          <TextField
            label="Código"
            type="search"
            
            autoComplete="on"
            value={filters.codigo}
            onValueChange={(value) => updateFilter('codigo', normalizeCbhpmCodigo(value))}
            placeholder="4070101"
            maxLength={20}
          />
          <TextField
            label="Procedimento"
            type="search"
            autoComplete="on"
            value={filters.procedimento}
            onValueChange={(value) => updateFilter('procedimento', value)}
            placeholder="Consulta"
            maxLength={1000}
          />
          <TextField
            label="Porte"
            type="search"
            autoComplete="off"
            value={filters.porte}
            onValueChange={(value) => updateFilter('porte', value.toUpperCase())}
            placeholder="2B"
            maxLength={10}
          />
          <IconButton
            label="Consultar procedimentos"
            title="Consultar procedimentos"
            onClick={onRefresh}
            disabled={loading || !canConsult || !canSearch}
          >
            <RefreshCw size={18} />
          </IconButton>
        </div>

        <div className="manual-procedure-row">
          <Button className="manual-procedure-action" onClick={handleAddManual} disabled={!canAddManual}>
            <Plus size={17} />
            Cadastrar manualmente
          </Button>
        </div>

        {!canConsult && (
          <AlertMessage type="warning">
            Sua licença não libera a consulta CBHPM. Use o cadastro manual quando necessário.
          </AlertMessage>
        )}
        {manualValidationError && <AlertMessage type="error">{manualValidationError}</AlertMessage>}
        {shouldShowFilterHint && <AlertMessage type="warning">{filterHint}</AlertMessage>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}

        <div className="table-wrap cbhpm-table-wrap">
          <table className="cbhpm-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('codigo')} aria-sort={sortBy === 'codigo' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Código
                    {sortBy === 'codigo' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('procedimento')} aria-sort={sortBy === 'procedimento' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Procedimento
                    {sortBy === 'procedimento' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('porte')} aria-sort={sortBy === 'porte' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Porte
                    {sortBy === 'porte' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('valorreferencia')} aria-sort={sortBy === 'valorreferencia' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Valor referência
                    {sortBy === 'valorreferencia' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
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
                    <td data-label="Código">{normalizeCbhpmCodigo(item.codigo) || item.codigo}</td>
                    <td data-label="Procedimento">{item.procedimento}</td>
                    <td data-label="Porte">{item.porte || '-'}</td>
                    <td data-label="Valor referência">{formatCurrency(item.valorReferencia)}</td>
                    <td data-label="Selecionar">
                      <Button className="select-procedure-action" onClick={() => onSelect(item)}>
                        <CheckCircle2 size={17} />
                        Adicionar
                      </Button>
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
            <IconButton
              label="Página anterior"
              onClick={() => onPageChange((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <span className="page-indicator">Página {currentPage} de {totalPages}</span>
            <IconButton
              label="Próxima página"
              onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </IconButton>
          </div>
        </div>
      </Modal>
  );
});
