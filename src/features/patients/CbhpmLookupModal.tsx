import { type Dispatch, type SetStateAction, memo, useCallback, useMemo, useState } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import type { CbhpmGeral } from './patientTypes';
import type { CbhpmFilters } from '../../appTypes';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton, TextField } from '../../shared/components/ui';
import { CbhpmResultsTable } from '../../shared/components/CbhpmResultsTable';
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

  const manualValues = useMemo(
    () => ({
      codigo: normalizeCbhpmCodigo(filters.codigo),
      procedimento: filters.procedimento.trim(),
      porte: filters.porte.trim().toUpperCase(),
    }),
    [filters.codigo, filters.procedimento, filters.porte],
  );

  const canAddManual = Boolean(manualValues.procedimento);

  const updateFilter = useCallback(
    (field: keyof CbhpmFilters, value: string) => {
      setManualValidationError('');
      onFiltersChange((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [onFiltersChange],
  );

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
        <IconButton
          label="Fechar seleção de procedimento"
          title="Fechar"
          tone="muted"
          onClick={onClose}
        >
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
        <Button
          className="manual-procedure-action"
          onClick={handleAddManual}
          disabled={!canAddManual}
        >
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

      <CbhpmResultsTable
        items={items}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        onPageChange={onPageChange}
        onSelect={onSelect}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        formatCode={normalizeCbhpmCodigo}
        wrapClassName="cbhpm-table-wrap"
        tableClassName="cbhpm-table"
        paginationClassName="cbhpm-pagination"
        selectClassName="select-procedure-action"
      />
    </Modal>
  );
});
