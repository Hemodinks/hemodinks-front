import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Ban, Pencil, Save, X } from 'lucide-react';
import { Button, DataPanel, IconButton, SelectField, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { Convenio } from '../../shared/domain/clinicalContracts';
import type { ConvenioProcedimentoPreco } from './billingDomainTypes';
import type { PriceFormState } from './billingPageTypes';
import { SortableHeader } from '../../shared/components/listing';
import { useSortableData } from '../../shared/hooks/useSortableData';

type PricesSectionProps = {
  canManage: boolean;
  editingId: number | null;
  loading: boolean;
  form: PriceFormState;
  convenios: Convenio[];
  precos: ConvenioProcedimentoPreco[];
  setForm: Dispatch<SetStateAction<PriceFormState>>;
  onSubmit: (event: FormEvent) => void;
  onCancelEditing: () => void;
  onEdit: (item: ConvenioProcedimentoPreco) => void;
  onDeactivate: (item: ConvenioProcedimentoPreco) => void;
};

export function PricesSection({
  canManage,
  editingId,
  loading,
  form,
  convenios,
  precos,
  setForm,
  onSubmit,
  onCancelEditing,
  onEdit,
  onDeactivate,
}: PricesSectionProps) {
  const sorting = useSortableData(precos, {
    convenio: (item) =>
      convenios.find((convenio) => convenio.idConvenio === item.convenioId)?.descricaoConvenio ||
      item.convenioId,
    cbhpm: (item) => item.cbhpmCodigo,
    valor: (item) => item.valorNegociado,
    vigencia: (item) => item.vigenciaInicio,
  });

  return (
    <>
      {canManage && (
        <DataPanel>
          <div className="billing-section-heading">
            <div>
              <span className="eyebrow">Contratos</span>
              <h3>Preço negociado por convênio</h3>
            </div>
          </div>
          <form className="billing-filter-grid" onSubmit={onSubmit}>
            <SelectField
              label="Convênio"
              value={form.convenioId}
              required
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  convenioId: event.target.value,
                }))
              }
            >
              <option value="">Selecione</option>
              {convenios.map((convenio) => (
                <option key={convenio.idConvenio} value={convenio.idConvenio}>
                  {convenio.descricaoConvenio}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Código CBHPM"
              value={form.cbhpmCodigo}
              required
              onValueChange={(cbhpmCodigo) => setForm((current) => ({ ...current, cbhpmCodigo }))}
            />
            <TextField
              label="Valor negociado"
              type="number"
              min="0"
              step="0.01"
              value={form.valorNegociado}
              required
              onValueChange={(valorNegociado) =>
                setForm((current) => ({ ...current, valorNegociado }))
              }
            />
            <TextField
              label="Percentual principal"
              type="number"
              min="0"
              step="0.0001"
              value={form.percentualPrincipal}
              onValueChange={(percentualPrincipal) =>
                setForm((current) => ({ ...current, percentualPrincipal }))
              }
            />
            <TextField
              label="Percentual auxiliar 1"
              type="number"
              min="0"
              step="0.0001"
              value={form.percentualAuxiliar1}
              onValueChange={(percentualAuxiliar1) =>
                setForm((current) => ({ ...current, percentualAuxiliar1 }))
              }
            />
            <TextField
              label="Percentual auxiliar 2"
              type="number"
              min="0"
              step="0.0001"
              value={form.percentualAuxiliar2}
              onValueChange={(percentualAuxiliar2) =>
                setForm((current) => ({ ...current, percentualAuxiliar2 }))
              }
            />
            <TextField
              label="Vigência inicial"
              type="date"
              value={form.vigenciaInicio}
              required
              onValueChange={(vigenciaInicio) =>
                setForm((current) => ({ ...current, vigenciaInicio }))
              }
            />
            <TextField
              label="Vigência final"
              type="date"
              value={form.vigenciaFinal}
              onValueChange={(vigenciaFinal) =>
                setForm((current) => ({ ...current, vigenciaFinal }))
              }
            />
            <div className="billing-form-actions">
              <Button variant="primary" type="submit" disabled={loading}>
                <Save size={16} />
                {editingId ? 'Atualizar preço' : 'Salvar preço'}
              </Button>
              {editingId && (
                <Button variant="danger-ghost" type="button" onClick={onCancelEditing}>
                  <X size={16} /> Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </DataPanel>
      )}
      <DataPanel className="billing-table-panel">
        <div className="table-wrap">
          <table className="billing-table billing-price-table">
            <thead>
              <tr>
                {[
                  ['convenio', 'Convênio'],
                  ['cbhpm', 'CBHPM'],
                  ['valor', 'Valor'],
                  ['vigencia', 'Vigência'],
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
                <th className="billing-status-actions-column">Status / ações</th>
              </tr>
            </thead>
            <tbody>
              {sorting.sortedItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="Convênio">
                    {convenios.find((convenio) => convenio.idConvenio === item.convenioId)
                      ?.descricaoConvenio || item.convenioId}
                  </td>
                  <td data-label="CBHPM">{item.cbhpmCodigo}</td>
                  <td data-label="Valor">{formatCurrency(item.valorNegociado)}</td>
                  <td data-label="Vigência">
                    {new Date(item.vigenciaInicio).toLocaleDateString('pt-BR')} —{' '}
                    {item.vigenciaFinal
                      ? new Date(item.vigenciaFinal).toLocaleDateString('pt-BR')
                      : 'sem término'}
                  </td>
                  <td className="billing-status-actions-column" data-label="Status / ações">
                    <span className="status-pill active">{item.ativo ? 'Ativo' : 'Inativo'}</span>
                    <div className="billing-row-actions">
                      {canManage && (
                        <IconButton
                          label="Editar preço"
                          title="Editar preço"
                          tone="muted"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil size={17} />
                        </IconButton>
                      )}
                      {canManage && item.ativo && (
                        <IconButton
                          label={`Desativar preço ${item.cbhpmCodigo}`}
                          title="Desativar preço"
                          tone="danger"
                          onClick={() => onDeactivate(item)}
                        >
                          <Ban size={17} />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!precos.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Nenhum preço cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataPanel>
    </>
  );
}
