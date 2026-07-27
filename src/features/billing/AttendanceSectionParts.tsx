import type { Dispatch, SetStateAction } from 'react';
import { Pencil, Search, Trash2, X } from 'lucide-react';
import { Button, DataPanel, IconButton } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AtendimentoCirurgico } from '../../types';
import type { AtendimentoProcedureDraft } from './billingPageTypes';

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
            <article className="billing-selected-procedure" key={`${item.cbhpmCodigo || 'manual'}-${index}`}>
              <div>
                {item.cbhpmCodigo && <span className="billing-procedure-code">{item.cbhpmCodigo}</span>}
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
                onClick={() => setProcedimentos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
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
  return (
    <DataPanel className="billing-table-panel">
      <div className="table-wrap">
        <table className="billing-table billing-attendance-table">
          <thead>
            <tr>
              <th>Paciente</th><th>Data</th><th>Status</th><th>Procedimentos</th>
              <th className="billing-actions-column">Ações</th>
            </tr>
          </thead>
          <tbody>
            {atendimentos.map((item) => (
              <tr key={item.id}>
                <td data-label="Paciente"><Button onClick={() => onSelect(item)}>{item.paciente}</Button></td>
                <td data-label="Data">{new Date(item.dataProcedimento).toLocaleDateString('pt-BR')}</td>
                <td data-label="Status">{item.status}</td>
                <td data-label="Procedimentos">
                  {item.procedimentos.map((procedure) => procedure.cbhpmCodigo || procedure.descricao).join(', ')}
                </td>
                <td className="billing-actions-column" data-label="Ações">
                  <div className="billing-row-actions">
                    <IconButton label="Editar" title="Editar" tone="muted" onClick={() => onEdit(item)}>
                      <Pencil size={17} />
                    </IconButton>
                    <IconButton label="Excluir" title="Excluir" tone="danger" onClick={() => onDelete(item)}>
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
}
