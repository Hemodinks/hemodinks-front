import { Pencil, Trash2, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { DataPanel, IconButton } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AtendimentoCirurgico } from './billingDomainTypes';
import { SortableHeader } from '../../shared/components/listing';
import { useSortableData } from '../../shared/hooks/useSortableData';

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <DataPanel>
      <span>{title}</span>
      <h3>{value}</h3>
    </DataPanel>
  );
}

export function AttendanceDetailsModal({
  item,
  onEdit,
  onDelete,
  onClose,
}: {
  item: AtendimentoCirurgico;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const sorting = useSortableData(item.procedimentos, {
    cbhpm: (procedure) => procedure.cbhpmCodigo,
    procedimento: (procedure) => procedure.descricao,
    quantidade: (procedure) => procedure.quantidade,
    peso: (procedure) => procedure.pesoPercentual,
    referencia: (procedure) => procedure.valorReferencia,
    negociado: (procedure) => procedure.valorNegociado,
  });

  return (
    <Modal
      titleId="attendance-detail-title"
      className="billing-attendance-detail-modal"
      onClose={onClose}
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">Atendimento cirúrgico</span>
          <h2 id="attendance-detail-title">{item.paciente}</h2>
        </div>
        <div className="billing-modal-actions">
          <IconButton
            label="Editar atendimento"
            title="Editar atendimento"
            tone="muted"
            onClick={onEdit}
          >
            <Pencil size={17} />
          </IconButton>
          <IconButton
            label="Excluir atendimento"
            title="Excluir atendimento"
            tone="danger"
            onClick={onDelete}
          >
            <Trash2 size={17} />
          </IconButton>
          <IconButton label="Fechar detalhes do atendimento" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
      </div>
      <section className="billing-summary-grid">
        <Summary title="Data" value={new Date(item.dataProcedimento).toLocaleDateString('pt-BR')} />
        <Summary title="Status" value={item.status} />
        <Summary title="Autorização" value={item.numeroAutorizacao || 'Não informada'} />
        <Summary
          title="Glosa"
          value={
            item.valorGlosa
              ? `${formatCurrency(item.valorGlosa)} — ${item.motivoGlosa}`
              : 'Não informada'
          }
        />
        <Summary title="Observações" value={item.observacao || 'Não informadas'} />
        <Summary title="Arquivos" value={`${item.arquivos?.length ?? 0} anexo(s)`} />
      </section>
      <div className="table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              {[
                ['cbhpm', 'CBHPM'],
                ['procedimento', 'Procedimento'],
                ['quantidade', 'Quantidade'],
                ['peso', 'Peso'],
                ['referencia', 'Referência'],
                ['negociado', 'Negociado'],
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
            </tr>
          </thead>
          <tbody>
            {sorting.sortedItems.map((procedure) => (
              <tr key={procedure.id}>
                <td>{procedure.cbhpmCodigo || '-'}</td>
                <td>{procedure.descricao}</td>
                <td>{procedure.quantidade}</td>
                <td>{procedure.pesoPercentual}%</td>
                <td>
                  {procedure.valorReferencia == null
                    ? '-'
                    : formatCurrency(procedure.valorReferencia)}
                </td>
                <td>
                  {procedure.valorNegociado == null
                    ? '-'
                    : formatCurrency(procedure.valorNegociado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="file-hint">
        Os valores exibidos são o snapshot preservado na data do atendimento.
      </p>
    </Modal>
  );
}
