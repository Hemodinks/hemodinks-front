import { type FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { getCbhpmGeral } from "../../services";
import type { CbhpmGeral, PagedResult } from "../../types";
import { Modal } from "../../shared/components/Modal";
import {
  AlertMessage,
  Button,
  IconButton,
  TextField,
} from "../../shared/components/ui";
import { formatCurrency } from "../../shared/utils/formatters";

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
  const [filters, setFilters] = useState({ codigo: "", descricao: "" });
  const [appliedFilters, setAppliedFilters] = useState({
    codigo: "",
    descricao: "",
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<CbhpmGeral>>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProcedures = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getCbhpmGeral(token, {
          page,
          pageSize,
          codigo: appliedFilters.codigo || undefined,
          procedimento: appliedFilters.descricao || undefined,
          sortBy: "codigo",
          sortDirection: "asc",
        });
        if (active) setResult(response);
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível consultar os procedimentos CBHPM.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProcedures();
    return () => {
      active = false;
    };
  }, [appliedFilters, page, token]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      codigo: filters.codigo.trim(),
      descricao: filters.descricao.trim(),
    });
  };

  const clearFilters = () => {
    const cleared = { codigo: "", descricao: "" };
    setFilters(cleared);
    setPage(1);
    setAppliedFilters(cleared);
  };

  const totalPages = Math.max(1, result.totalPages);
  const visibleStart = result.totalItems ? (page - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(page * pageSize, result.totalItems);

  return (
    <Modal
      titleId="billing-cbhpm-title"
      className="billing-cbhpm-modal"
      onClose={onClose}
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">Tabela CBHPM</span>
          <h2 id="billing-cbhpm-title">Consultar procedimentos</h2>
        </div>
        <IconButton
          label="Fechar consulta CBHPM"
          tone="muted"
          onClick={onClose}
        >
          <X size={18} />
        </IconButton>
      </div>

      <form className="billing-cbhpm-filters" onSubmit={applyFilters}>
        <TextField
          label="Código"
          type="search"
          value={filters.codigo}
          onValueChange={(codigo) =>
            setFilters((current) => ({ ...current, codigo }))
          }
          placeholder="Ex.: 40701018"
          autoComplete="off"
        />
        <TextField
          label="Descrição do procedimento"
          type="search"
          value={filters.descricao}
          onValueChange={(descricao) =>
            setFilters((current) => ({ ...current, descricao }))
          }
          placeholder="Ex.: cirurgia vascular"
          autoComplete="off"
        />
        <div className="billing-cbhpm-filter-actions">
          <Button type="button" onClick={clearFilters} disabled={loading}>
            Limpar filtros
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <Search size={17} />
            Consultar
          </Button>
        </div>
      </form>

      {error && <AlertMessage type="error">{error}</AlertMessage>}

      <div className="table-wrap billing-cbhpm-table-wrap">
        <table className="billing-table billing-cbhpm-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Porte</th>
              <th>Valor de referência</th>
              <th aria-label="Selecionar procedimento" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  Carregando procedimentos...
                </td>
              </tr>
            ) : result.items.length ? (
              result.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Código">{item.codigo}</td>
                  <td data-label="Descrição">{item.procedimento}</td>
                  <td data-label="Porte">{item.porte || "-"}</td>
                  <td data-label="Valor de referência">
                    {item.valorReferencia == null
                      ? "-"
                      : formatCurrency(item.valorReferencia)}
                  </td>
                  <td data-label="Selecionar">
                    <Button
                      className="billing-cbhpm-select"
                      onClick={() => onSelect(item)}
                    >
                      <CheckCircle2 size={17} />
                      Selecionar
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-row">
                  Nenhum procedimento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar billing-cbhpm-pagination">
        <span>
          {visibleStart}-{visibleEnd} de {result.totalItems}
        </span>
        <div className="pagination-actions">
          <IconButton
            label="Página anterior"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={loading || page === 1}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span className="page-indicator">
            Página {page} de {totalPages}
          </span>
          <IconButton
            label="Próxima página"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={loading || page >= totalPages}
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>
    </Modal>
  );
}
