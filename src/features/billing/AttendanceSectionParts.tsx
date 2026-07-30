import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Info, Pencil, Search, Trash2, X } from 'lucide-react';
import { Button, DataPanel, IconButton, SelectField, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AtendimentoCirurgico } from './billingDomainTypes';
import type { AtendimentoProcedureDraft } from './billingPageTypes';
import { Pagination, SortableHeader } from '../../shared/components/listing';
import { useClientPagination } from '../../shared/hooks/useClientPagination';
import { useSortableData } from '../../shared/hooks/useSortableData';
import { getRecordActivityTime } from '../../shared/utils/listing';

export function AttendanceProceduresField({
  procedimentos,
  setProcedimentos,
  onOpenCbhpm,
}: {
  procedimentos: AtendimentoProcedureDraft[];
  setProcedimentos: Dispatch<SetStateAction<AtendimentoProcedureDraft[]>>;
  onOpenCbhpm: () => void;
}) {
  return (
    <div className="billing-attendance-procedures">
      <span className="billing-attendance-field-label">Procedimento</span>
      <Button type="button" className="billing-cbhpm-open" onClick={onOpenCbhpm}>
        <Search size={17} /> Consultar CBHPM
      </Button>
      {procedimentos.length ? (
        <div className="billing-selected-procedures">
          {procedimentos.map((item, index) => (
            <article
              className="billing-selected-procedure"
              key={`${item.cbhpmCodigo || 'manual'}-${index}`}
            >
              <div>
                {item.cbhpmCodigo && (
                  <span className="billing-procedure-code">{item.cbhpmCodigo}</span>
                )}
                <strong>{item.descricao}</strong>
                {item.valorReferencia != null && (
                  <span className="billing-procedure-price">
                    Valor de referência: {formatCurrency(item.valorReferencia)}
                  </span>
                )}
              </div>
              {item.porte && <span className="billing-procedure-porte">{item.porte}</span>}
              <Button
                type="button"
                className="billing-procedure-remove"
                aria-label={`Remover ${item.descricao || 'procedimento'}`}
                title="Remover procedimento"
                onClick={() =>
                  setProcedimentos((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <X size={15} />
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <span className="file-hint">Nenhum procedimento selecionado.</span>
      )}
    </div>
  );
}

export function AttendancesTable({
  atendimentos,
  onSelect,
  onEdit,
  onDelete,
}: {
  atendimentos: AtendimentoCirurgico[];
  onSelect: (item: AtendimentoCirurgico) => void;
  onEdit: (item: AtendimentoCirurgico) => void;
  onDelete: (item: AtendimentoCirurgico) => void;
}) {
  const [patientFilter, setPatientFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredAttendances = useMemo(() => {
    const normalizedPatient = patientFilter.trim().toLocaleLowerCase('pt-BR');
    return atendimentos.filter(
      (item) =>
        (!normalizedPatient ||
          item.paciente.toLocaleLowerCase('pt-BR').includes(normalizedPatient)) &&
        (!dateFilter || item.dataProcedimento.slice(0, 10) === dateFilter) &&
        (!statusFilter || item.status === statusFilter),
    );
  }, [atendimentos, dateFilter, patientFilter, statusFilter]);
  const sorting = useSortableData(
    filteredAttendances,
    {
      recent: getRecordActivityTime,
      paciente: (item) => item.paciente,
      data: (item) => item.dataProcedimento,
      status: (item) => item.status,
    },
    'recent',
    'desc',
  );
  const pagination = useClientPagination(sorting.sortedItems);

  return (
    <DataPanel className="billing-table-panel">
      <div className="billing-list-filters" aria-label="Filtros de atendimentos">
        <TextField
          label="Nome do paciente"
          value={patientFilter}
          onValueChange={setPatientFilter}
        />
        <TextField
          label="Data do atendimento"
          type="date"
          value={dateFilter}
          onValueChange={setDateFilter}
        />
        <SelectField
          label="Status do atendimento"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Todos</option>
          {['Planejado', 'Autorizado', 'Realizado', 'Cancelado'].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </SelectField>
        <Button
          type="button"
          onClick={() => {
            setPatientFilter('');
            setDateFilter('');
            setStatusFilter('');
          }}
        >
          Limpar filtros
        </Button>
      </div>
      <div className="table-wrap">
        <table className="billing-table billing-attendance-table">
          <thead>
            <tr>
              {[
                ['paciente', 'Paciente'],
                ['data', 'Data'],
                ['status', 'Status'],
              ].map(([field, label]) => (
                <SortableHeader
                  key={field}
                  field={field}
                  label={label}
                  sortBy={sorting.sortBy}
                  sortDirection={sorting.sortDirection}
                  onSortChange={sorting.handleSortChange}
                />
              ))}
              <th>Procedimentos</th>
              <th className="billing-actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagination.visibleItems.map((item) => (
              <tr key={item.id}>
                <td data-label="Paciente">
                  <Button onClick={() => onSelect(item)}>{item.paciente}</Button>
                </td>
                <td data-label="Data">
                  {new Date(item.dataProcedimento).toLocaleDateString('pt-BR')}
                </td>
                <td data-label="Status">{item.status}</td>
                <td data-label="Procedimentos">
                  <IconButton
                    label={`Ver procedimentos de ${item.paciente}`}
                    title="Ver procedimentos"
                    tone="muted"
                    onClick={() => onSelect(item)}
                  >
                    <Info size={17} />
                  </IconButton>
                </td>
                <td className="billing-actions-column" data-label="Ações">
                  <div className="billing-row-actions">
                    <IconButton
                      label="Editar"
                      title="Editar"
                      tone="muted"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil size={17} />
                    </IconButton>
                    <IconButton
                      label="Excluir"
                      title="Excluir"
                      tone="danger"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        entityLabel="atendimentos"
        visibleStart={pagination.visibleStart}
        visibleEnd={pagination.visibleEnd}
        totalItems={pagination.totalItems}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setCurrentPage}
      />
    </DataPanel>
  );
}
