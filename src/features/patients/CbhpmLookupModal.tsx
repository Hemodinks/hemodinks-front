import { type Dispatch, type SetStateAction, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, RefreshCw, X } from 'lucide-react';
import type { CbhpmGeral } from '../../types';
import type { CbhpmFilters } from '../../appTypes';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { normalizeCbhpmCodigo } from './patientUtils';

type CbhpmLookupModalProps = {
  items: CbhpmGeral[];
  filters: CbhpmFilters;
  isAdmin: boolean;
  loading: boolean;
  error: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  visibleStart: number;
  visibleEnd: number;
  onFiltersChange: Dispatch<SetStateAction<CbhpmFilters>>;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onRefresh: () => void;
  onSelect: (procedimento: CbhpmGeral) => void;
  onClose: () => void;
};

export function CbhpmLookupModal({
  items,
  filters,
  isAdmin,
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
  const manualCodigo = normalizeCbhpmCodigo(filters.codigo);
  const manualProcedimento = filters.procedimento.trim();
  const manualPorte = filters.porte.trim().toUpperCase();
  const canAddManual = Boolean(manualCodigo && manualProcedimento);
  const [manualValidationError, setManualValidationError] = useState('');

  const updateFilter = (field: keyof CbhpmFilters, value: string) => {
    setManualValidationError('');
    onPageChange(1);
    onFiltersChange((current) => ({ ...current, [field]: value }));
  };

  const handleAddManual = () => {
    if (!manualProcedimento) {
      setManualValidationError('Informe a descricao do procedimento para cadastrar manualmente.');
      return;
    }

    if (!isAdmin && !canAddManual) {
      return;
    }

    onSelect({
      id: 0,
      codigo: manualCodigo,
      procedimento: manualProcedimento,
      porte: manualPorte || null,
      valorReferencia: null,
    });
  };

  return (
    <Modal titleId="cbhpm-title" className="cbhpm-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">CBHPM</span>
            <h2 id="cbhpm-title">Selecionar procedimento</h2>
          </div>
          <IconButton label="Fechar selecao de procedimento" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="cbhpm-filters">
          <TextField
            label="Codigo"
            type="search"
            value={filters.codigo}
            onValueChange={(value) => updateFilter('codigo', normalizeCbhpmCodigo(value))}
            placeholder="101"
            maxLength={20}
          />
          <TextField
            label="Procedimento"
            type="search"
            value={filters.procedimento}
            onValueChange={(value) => updateFilter('procedimento', value)}
            placeholder="Consulta"
            maxLength={1000}
          />
          <TextField
            label="Porte"
            type="search"
            value={filters.porte}
            onValueChange={(value) => updateFilter('porte', value.toUpperCase())}
            placeholder="2B"
            maxLength={10}
          />
          <IconButton label="Atualizar procedimentos" onClick={onRefresh}>
            <RefreshCw size={18} />
          </IconButton>
        </div>

        <div className="manual-procedure-row">
          <Button className="manual-procedure-action" onClick={handleAddManual} disabled={!isAdmin && !canAddManual}>
            <Plus size={17} />
            Cadastrar manualmente
          </Button>
        </div>

        {manualValidationError && <AlertMessage type="error">{manualValidationError}</AlertMessage>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}

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
                    <td data-label="Codigo">{normalizeCbhpmCodigo(item.codigo) || item.codigo}</td>
                    <td data-label="Procedimento">{item.procedimento}</td>
                    <td data-label="Porte">{item.porte || '-'}</td>
                    <td data-label="Valor referencia">{formatCurrency(item.valorReferencia)}</td>
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
              label="Pagina anterior"
              onClick={() => onPageChange((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <span className="page-indicator">Pagina {currentPage} de {totalPages}</span>
            <IconButton
              label="Proxima pagina"
              onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </IconButton>
          </div>
        </div>
      </Modal>
  );
}
