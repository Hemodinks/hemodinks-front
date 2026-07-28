import { type FormEvent, useEffect, useState } from 'react';
import { Eraser, Plus, Search, X } from 'lucide-react';
import type { CbhpmGeral } from '../../shared/domain/clinicalContracts';
import type { PagedResult } from '../../shared/domain/apiTypes';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton, TextField } from '../../shared/components/ui';
import { CbhpmResultsTable } from '../../shared/components/CbhpmResultsTable';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { useBillingCbhpmGateway } from './useBillingCbhpmGateway';

type BillingCbhpmLookupModalProps = {
  token: string;
  onSelect: (procedure: CbhpmGeral) => void;
  onClose: () => void;
};

const pageSize = 10;
const emptyResult: PagedResult<CbhpmGeral> = {
  items: [],
  page: 1,
  pageSize,
  totalItems: 0,
  totalPages: 0,
};

export function BillingCbhpmLookupModal({
  token,
  onSelect,
  onClose,
}: BillingCbhpmLookupModalProps) {
  const cbhpmGateway = useBillingCbhpmGateway(token);
  const [filters, setFilters] = useState({
    codigo: '',
    descricao: '',
    porte: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    codigo: '',
    descricao: '',
    porte: '',
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<CbhpmGeral>>(emptyResult);
  const [error, setError] = useState('');
  const [manualError, setManualError] = useState('');
  const searchOperation = useAsyncOperation(
    (_signal, query: Parameters<typeof cbhpmGateway.search>[0]) => cbhpmGateway.search(query),
  );
  const loading = searchOperation.isLoading;

  useEffect(() => {
    let active = true;

    const loadProcedures = async () => {
      setError('');
      try {
        const response = await searchOperation.execute({
          page,
          pageSize,
          codigo: appliedFilters.codigo || undefined,
          procedimento: appliedFilters.descricao || undefined,
          porte: appliedFilters.porte || undefined,
          sortBy: 'codigo',
          sortDirection: 'asc',
        });
        if (active) setResult(response);
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Não foi possível consultar os procedimentos CBHPM.',
          );
        }
      }
    };

    void loadProcedures();
    return () => {
      active = false;
      searchOperation.cancel();
    };
  }, [appliedFilters, page, token]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      codigo: filters.codigo.trim(),
      descricao: filters.descricao.trim(),
      porte: filters.porte.trim().toUpperCase(),
    });
  };

  const clearFilters = () => {
    const cleared = { codigo: '', descricao: '', porte: '' };
    setFilters(cleared);
    setManualError('');
    setPage(1);
    setAppliedFilters(cleared);
  };

  const addManualProcedure = () => {
    const description = filters.descricao.trim();
    if (!description) {
      setManualError('Informe a descrição do procedimento para cadastrá-lo manualmente.');
      return;
    }

    onSelect({
      id: 0,
      codigo: filters.codigo.replace(/\D/g, ''),
      procedimento: description,
      porte: filters.porte.trim().toUpperCase() || null,
      valorReferencia: null,
    });
  };

  const totalPages = Math.max(1, result.totalPages);
  const visibleStart = result.totalItems ? (page - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(page * pageSize, result.totalItems);

  return (
    <Modal titleId="billing-cbhpm-title" className="billing-cbhpm-modal" onClose={onClose}>
      <div className="panel-title">
        <div>
          <span className="eyebrow">Tabela CBHPM</span>
          <h2 id="billing-cbhpm-title">Consultar procedimentos</h2>
        </div>
        <IconButton label="Fechar consulta CBHPM" tone="muted" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <form className="billing-cbhpm-filters" onSubmit={applyFilters}>
        <TextField
          label="Código"
          type="search"
          value={filters.codigo}
          onValueChange={(codigo) =>
            setFilters((current) => ({
              ...current,
              codigo: codigo.replace(/\D/g, ''),
            }))
          }
          placeholder="Ex.: 40701018"
          autoComplete="off"
        />
        <TextField
          label="Descrição do procedimento"
          type="search"
          value={filters.descricao}
          onValueChange={(descricao) => setFilters((current) => ({ ...current, descricao }))}
          placeholder="Ex.: cirurgia vascular"
          autoComplete="off"
        />
        <TextField
          label="Porte"
          type="search"
          value={filters.porte}
          onValueChange={(porte) =>
            setFilters((current) => ({
              ...current,
              porte: porte.toUpperCase(),
            }))
          }
          placeholder="Ex.: 2B"
          autoComplete="off"
        />
        <div className="billing-cbhpm-filter-actions">
          <Button type="button" onClick={clearFilters} disabled={loading}>
            <Eraser size={17} />
            Limpar filtros
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <Search size={17} />
            Consultar
          </Button>
        </div>
      </form>

      <div className="billing-cbhpm-manual-row">
        <Button type="button" className="billing-cbhpm-manual" onClick={addManualProcedure}>
          <Plus size={17} />
          Cadastrar manualmente
        </Button>
      </div>

      {error && <AlertMessage type="error">{error}</AlertMessage>}
      {manualError && <AlertMessage type="error">{manualError}</AlertMessage>}

      <CbhpmResultsTable
        items={result.items}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        totalItems={result.totalItems}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        onPageChange={setPage}
        onSelect={onSelect}
        wrapClassName="billing-cbhpm-table-wrap"
        tableClassName="billing-table billing-cbhpm-table"
        paginationClassName="billing-cbhpm-pagination"
        selectClassName="billing-cbhpm-select"
      />
    </Modal>
  );
}
