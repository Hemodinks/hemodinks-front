import type { FormEvent } from 'react';
import { Pencil, Save } from 'lucide-react';
import { Button, IconButton, TextField } from '../../../shared/components/ui';
import { formatCurrency } from '../../../shared/utils/formatters';
import type { Faturamento } from '../billingDomainTypes';
import type { useInvoicing } from './useInvoicing';

type InvoicingState = ReturnType<typeof useInvoicing>;

type InvoicingItemsPanelProps = {
  selectedBilling: Faturamento;
  billingItemDraft: InvoicingState['billingItemDraft'];
  setBillingItemDraft: InvoicingState['setBillingItemDraft'];
  saveBillingItem: (event: FormEvent) => void;
  canManageBilling: boolean;
};

export function InvoicingItemsPanel({
  selectedBilling,
  billingItemDraft,
  setBillingItemDraft,
  saveBillingItem,
  canManageBilling,
}: InvoicingItemsPanelProps) {
  return (
    <>
      <h3>Itens</h3>
      <div className="table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Quantidade</th>
              <th>Peso</th>
              <th>Unitário</th>
              <th>Apresentado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {selectedBilling.itens.map((item) => (
              <tr key={item.id}>
                <td>{item.codigo || '-'}</td>
                <td>{item.descricao}</td>
                <td>{item.quantidade}</td>
                <td>{item.pesoPercentual}%</td>
                <td>{formatCurrency(item.valorUnitario)}</td>
                <td>{formatCurrency(item.valorApresentado)}</td>
                <td>
                  {selectedBilling.status === 'Rascunho' && canManageBilling && (
                    <IconButton
                      label="Editar item"
                      title="Editar item"
                      tone="muted"
                      onClick={() =>
                        setBillingItemDraft({
                          itemId: item.id,
                          codigo: item.codigo || '',
                          descricao: item.descricao,
                          quantidade: String(item.quantidade),
                          pesoPercentual: String(item.pesoPercentual),
                          valorUnitario: String(item.valorUnitario),
                        })
                      }
                    >
                      <Pencil size={17} />
                    </IconButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {billingItemDraft && (
        <form className="billing-filter-grid" onSubmit={saveBillingItem}>
          <TextField
            label="Código"
            value={billingItemDraft.codigo}
            onValueChange={(codigo) => setBillingItemDraft({ ...billingItemDraft, codigo })}
          />
          <TextField
            label="Descrição"
            value={billingItemDraft.descricao}
            required
            onValueChange={(descricao) => setBillingItemDraft({ ...billingItemDraft, descricao })}
          />
          <TextField
            label="Quantidade"
            type="number"
            min="0.0001"
            step="0.0001"
            value={billingItemDraft.quantidade}
            required
            onValueChange={(quantidade) => setBillingItemDraft({ ...billingItemDraft, quantidade })}
          />
          <TextField
            label="Peso percentual"
            type="number"
            min="0"
            step="0.0001"
            value={billingItemDraft.pesoPercentual}
            required
            onValueChange={(pesoPercentual) =>
              setBillingItemDraft({ ...billingItemDraft, pesoPercentual })
            }
          />
          <TextField
            label="Valor unitário"
            type="number"
            min="0"
            step="0.01"
            value={billingItemDraft.valorUnitario}
            required
            onValueChange={(valorUnitario) =>
              setBillingItemDraft({ ...billingItemDraft, valorUnitario })
            }
          />
          <Button variant="primary" type="submit">
            <Save size={16} />
            Salvar item
          </Button>
        </form>
      )}
    </>
  );
}
