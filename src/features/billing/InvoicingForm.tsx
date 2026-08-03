import { Plus, Save, X } from 'lucide-react';
import { Button, DataPanel, SelectField, TextField } from '../../shared/components/ui';
import type { InvoicingSectionProps } from './invoicingSectionTypes';

type InvoicingFormProps = Pick<
  InvoicingSectionProps,
  | 'atendimentos'
  | 'canManage'
  | 'editingId'
  | 'form'
  | 'loading'
  | 'onCancelEditing'
  | 'onSubmit'
  | 'onToggleForm'
  | 'setForm'
  | 'showForm'
>;

export function InvoicingForm({
  atendimentos,
  canManage,
  editingId,
  form,
  loading,
  onCancelEditing,
  onSubmit,
  onToggleForm,
  setForm,
  showForm,
}: InvoicingFormProps) {
  return (
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
  );
}
