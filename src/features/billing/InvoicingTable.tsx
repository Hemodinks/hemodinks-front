import { CheckCircle2, Pencil, RotateCcw, Send, Trash2, Wallet } from 'lucide-react';
import { Pagination, SortableHeader } from '../../shared/components/listing';
import { Button, IconButton } from '../../shared/components/ui';
import { useClientPagination } from '../../shared/hooks/useClientPagination';
import { useSortableData } from '../../shared/hooks/useSortableData';
import { formatCurrency } from '../../shared/utils/formatters';
import { getRecordActivityTime } from '../../shared/utils/listing';
import type { Faturamento } from './billingDomainTypes';
import type { InvoicingSectionProps } from './invoicingSectionTypes';

type InvoicingTableProps = Pick<
  InvoicingSectionProps,
  | 'canManage'
  | 'onCreateAccount'
  | 'onDelete'
  | 'onEdit'
  | 'onOpenAppeal'
  | 'onOpenReturn'
  | 'onPrepare'
  | 'onSelect'
  | 'onSend'
> & {
  faturamentos: Faturamento[];
};

function formatStatus(status: string) {
  return status.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, '$1 $2');
}

export function InvoicingTable({
  canManage,
  faturamentos,
  onCreateAccount,
  onDelete,
  onEdit,
  onOpenAppeal,
  onOpenReturn,
  onPrepare,
  onSelect,
  onSend,
}: InvoicingTableProps) {
  const sorting = useSortableData(
    faturamentos,
    {
      recent: getRecordActivityTime,
      paciente: (item) => item.paciente,
      guia: (item) => item.numeroGuia,
      apresentado: (item) => item.valorApresentado,
      glosa: (item) => item.valorGlosado,
      reconhecido: (item) => item.valorReconhecido,
      status: (item) => item.status,
    },
    'recent',
    'desc',
  );
  const pagination = useClientPagination(sorting.sortedItems);

  return (
    <>
      <div className="table-wrap">
        <table className="billing-table billing-flow-table">
          <thead>
            <tr>
              {[
                ['paciente', 'Paciente'],
                ['guia', 'Guia'],
                ['apresentado', 'Apresentado'],
                ['glosa', 'Glosa'],
                ['reconhecido', 'Reconhecido'],
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
              <th className="billing-actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagination.visibleItems.map((item) => (
              <tr key={item.id}>
                <td data-label="Paciente">
                  <Button onClick={() => onSelect(item)}>{item.paciente}</Button>
                  <span className="billing-record-reference">
                    Atendimento #{item.atendimentoCirurgicoId}
                  </span>
                </td>
                <td
                  className="billing-guide-cell"
                  data-label="Guia"
                  title={item.numeroGuia || undefined}
                >
                  {item.numeroGuia || '-'}
                </td>
                <td data-label="Apresentado">{formatCurrency(item.valorApresentado)}</td>
                <td data-label="Glosa">{formatCurrency(item.valorGlosado)}</td>
                <td data-label="Reconhecido">{formatCurrency(item.valorReconhecido)}</td>
                <td data-label="Status">
                  <span className="status-pill active">{formatStatus(item.status)}</span>
                </td>
                <td className="billing-actions-column" data-label="Ações">
                  <div className="billing-row-actions">
                    {canManage && item.status === 'Rascunho' && (
                      <>
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
                        <IconButton
                          label="Preparar faturamento"
                          title="Preparar faturamento para envio"
                          tone="muted"
                          onClick={() => onPrepare(item)}
                        >
                          <CheckCircle2 size={17} />
                        </IconButton>
                      </>
                    )}
                    {canManage && item.status === 'ProntoParaEnvio' && (
                      <IconButton
                        label="Enviar faturamento"
                        title="Enviar faturamento"
                        onClick={() => onSend(item)}
                      >
                        <Send size={17} />
                      </IconButton>
                    )}
                    {canManage &&
                      [
                        'Enviado',
                        'EmAnalise',
                        'GlosadoParcial',
                        'GlosadoTotal',
                        'Aprovado',
                      ].includes(item.status) && (
                        <IconButton
                          label="Registrar retorno"
                          title="Registrar retorno"
                          tone="muted"
                          onClick={() => onOpenReturn(item)}
                        >
                          <RotateCcw size={17} />
                        </IconButton>
                      )}
                    {canManage && item.status !== 'Rascunho' && item.status !== 'Cancelado' && (
                      <IconButton
                        label="Gerar título"
                        title="Gerar título"
                        onClick={() => onCreateAccount(item)}
                      >
                        <Wallet size={17} />
                      </IconButton>
                    )}
                    {canManage &&
                      item.glosas.map((glosa) => (
                        <IconButton
                          key={glosa.id}
                          label={`Recorrer glosa de ${formatCurrency(glosa.valorGlosado)}`}
                          title={`Recorrer glosa de ${formatCurrency(glosa.valorGlosado)}`}
                          tone="muted"
                          onClick={() => onOpenAppeal(glosa.id, glosa.valorGlosado)}
                        >
                          <RotateCcw size={17} />
                        </IconButton>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
            {!faturamentos.length && (
              <tr>
                <td colSpan={7} className="empty-row">
                  Nenhum faturamento no novo fluxo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        entityLabel="faturamentos"
        visibleStart={pagination.visibleStart}
        visibleEnd={pagination.visibleEnd}
        totalItems={pagination.totalItems}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setCurrentPage}
      />
    </>
  );
}
