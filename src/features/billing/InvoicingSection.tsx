import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { CheckCircle2, Pencil, Plus, RotateCcw, Save, Send, Trash2, Wallet, X } from 'lucide-react';
import { Button, DataPanel, IconButton, SelectField, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AtendimentoCirurgico, Faturamento } from './billingDomainTypes';
import type { FaturamentoFormState } from './billingPageTypes';
import { Pagination, SortableHeader } from '../../shared/components/listing';
import { useClientPagination } from '../../shared/hooks/useClientPagination';
import { useSortableData } from '../../shared/hooks/useSortableData';

type InvoicingSectionProps = {
  canManage: boolean;
  editingId: number | null;
  showForm: boolean;
  loading: boolean;
  form: FaturamentoFormState;
  atendimentos: AtendimentoCirurgico[];
  faturamentos: Faturamento[];
  setForm: Dispatch<SetStateAction<FaturamentoFormState>>;
  onToggleForm: () => void;
  onSubmit: (event: FormEvent) => void;
  onCancelEditing: () => void;
  onSelect: (item: Faturamento) => void;
  onEdit: (item: Faturamento) => void;
  onDelete: (item: Faturamento) => void;
  onPrepare: (item: Faturamento) => void;
  onSend: (item: Faturamento) => void;
  onOpenReturn: (item: Faturamento) => void;
  onCreateAccount: (item: Faturamento) => void;
  onOpenAppeal: (glosaId: number, valorGlosado: number) => void;
};

function formatStatus(status: string) {
  return status.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, '$1 $2');
}

export function InvoicingSection({
  canManage,
  editingId,
  showForm,
  loading,
  form,
  atendimentos,
  faturamentos,
  setForm,
  onToggleForm,
  onSubmit,
  onCancelEditing,
  onSelect,
  onEdit,
  onDelete,
  onPrepare,
  onSend,
  onOpenReturn,
  onCreateAccount,
  onOpenAppeal,
}: InvoicingSectionProps) {
  const sorting = useSortableData(faturamentos, {
    paciente: (item) => item.paciente,
    guia: (item) => item.numeroGuia,
    apresentado: (item) => item.valorApresentado,
    glosa: (item) => item.valorGlosado,
    reconhecido: (item) => item.valorReconhecido,
    status: (item) => item.status,
  });
  const pagination = useClientPagination(sorting.sortedItems);

  return (
    <>
      <DataPanel>
        <div className="billing-section-heading">
          <div>
            <span className="eyebrow">Cobrança</span>
            <h3>Faturamentos normalizados</h3>
          </div>
          {canManage && !editingId && (
            <Button variant="primary" onClick={onToggleForm}>
              <Plus size={16} /> Novo faturamento
            </Button>
          )}
        </div>
        {showForm && canManage && (
          <form className="billing-filter-grid" onSubmit={onSubmit}>
            <SelectField
              label="Atendimento"
              value={form.atendimentoCirurgicoId}
              required
              disabled={Boolean(editingId)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  atendimentoCirurgicoId: event.target.value,
                }))
              }
            >
              <option value="">Selecione</option>
              {atendimentos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.paciente} — {new Date(item.dataProcedimento).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Competência"
              type="month"
              value={form.competencia}
              required
              onValueChange={(competencia) => setForm((current) => ({ ...current, competencia }))}
            />
            <TextField
              label="Número da guia"
              value={form.numeroGuia}
              onValueChange={(numeroGuia) => setForm((current) => ({ ...current, numeroGuia }))}
            />
            <TextField
              label="Número do lote"
              value={form.numeroLote}
              onValueChange={(numeroLote) => setForm((current) => ({ ...current, numeroLote }))}
            />
            <TextField
              label="Observação"
              value={form.observacao}
              onValueChange={(observacao) => setForm((current) => ({ ...current, observacao }))}
            />
            <div className="billing-form-actions">
              <Button variant="primary" type="submit" disabled={loading}>
                <Save size={16} />
                {editingId ? 'Atualizar faturamento' : 'Gerar itens do faturamento'}
              </Button>
              {editingId && (
                <Button variant="danger-ghost" type="button" onClick={onCancelEditing}>
                  <X size={16} /> Cancelar edição
                </Button>
              )}
            </div>
          </form>
        )}
      </DataPanel>
      <DataPanel className="billing-table-panel">
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
                  </td>
                  <td data-label="Guia">{item.numeroGuia || '-'}</td>
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
      </DataPanel>
    </>
  );
}
