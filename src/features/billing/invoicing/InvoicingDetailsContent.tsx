import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { IconButton } from '../../../shared/components/ui';
import { formatCurrency } from '../../../shared/utils/formatters';
import type { AuthSession } from '../../../shared/domain/sessionTypes';
import type { Faturamento } from '../billingDomainTypes';
import type { useInvoicing } from './useInvoicing';
import { BillingDetailSummary } from '../BillingDetailSummary';
import { InvoicingItemsPanel } from './InvoicingItemsPanel';
import { InvoicingGlosasPanel } from './InvoicingGlosasPanel';
import type { InvoicingConfirmAction } from './invoicingDetailsTypes';

type InvoicingState = ReturnType<typeof useInvoicing>;

export type InvoicingDetailsModalProps = {
  selectedBilling: Faturamento;
  setSelectedBilling: InvoicingState['setSelectedBilling'];
  billingItemDraft: InvoicingState['billingItemDraft'];
  setBillingItemDraft: InvoicingState['setBillingItemDraft'];
  setGlosaDraft: InvoicingState['setGlosaDraft'];
  setRecursoDraft: InvoicingState['setRecursoDraft'];
  setConfirmAction: Dispatch<SetStateAction<InvoicingConfirmAction>>;
  saveBillingItem: (event: FormEvent) => void;
  session: AuthSession;
  canManageBilling: boolean;
  editBilling: (item: Faturamento) => void;
  deleteFaturamento: InvoicingState['removeInvoice'];
  deleteGlosa: InvoicingState['removeGlosa'];
  deleteRecursoGlosa: InvoicingState['removeAppeal'];
};

export function InvoicingDetailsContent({
  selectedBilling,
  setSelectedBilling,
  billingItemDraft,
  setBillingItemDraft,
  setGlosaDraft,
  setRecursoDraft,
  setConfirmAction,
  saveBillingItem,
  session,
  canManageBilling,
  editBilling,
  deleteFaturamento,
  deleteGlosa,
  deleteRecursoGlosa,
}: InvoicingDetailsModalProps) {
  const close = () => {
    setSelectedBilling(null);
    setBillingItemDraft(null);
  };

  return (
    <Modal
      titleId="billing-detail-title"
      className="billing-wide-modal billing-invoice-detail-modal"
      onClose={close}
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">Detalhe do faturamento</span>
          <h2 id="billing-detail-title">
            {selectedBilling.paciente} — {selectedBilling.numeroGuia || `#${selectedBilling.id}`}
          </h2>
        </div>
        <div className="billing-modal-actions">
          {canManageBilling && selectedBilling.status === 'Rascunho' && (
            <>
              <IconButton
                label="Editar faturamento"
                title="Editar faturamento"
                tone="muted"
                onClick={() => editBilling(selectedBilling)}
              >
                <Pencil size={17} />
              </IconButton>
              <IconButton
                label="Excluir faturamento"
                title="Excluir faturamento"
                tone="danger"
                onClick={() =>
                  setConfirmAction({
                    title: 'Excluir faturamento',
                    message: `Excluir o faturamento de ${selectedBilling.paciente}? Os itens em rascunho também serão removidos.`,
                    action: () => deleteFaturamento(selectedBilling.id, session.token),
                    success: 'Faturamento excluído.',
                    after: () => setSelectedBilling(null),
                  })
                }
              >
                <Trash2 size={17} />
              </IconButton>
            </>
          )}
          <IconButton label="Fechar detalhes do faturamento" onClick={close}>
            <X size={16} />
          </IconButton>
        </div>
      </div>

      <section className="billing-summary-grid">
        <BillingDetailSummary
          title="Apresentado"
          value={formatCurrency(selectedBilling.valorApresentado)}
        />
        <BillingDetailSummary
          title="Glosado"
          value={formatCurrency(selectedBilling.valorGlosado)}
        />
        <BillingDetailSummary
          title="Recuperado"
          value={formatCurrency(selectedBilling.valorGlosaRecuperada)}
        />
        <BillingDetailSummary
          title="Reconhecido"
          value={formatCurrency(selectedBilling.valorReconhecido)}
        />
      </section>

      <InvoicingItemsPanel
        selectedBilling={selectedBilling}
        billingItemDraft={billingItemDraft}
        setBillingItemDraft={setBillingItemDraft}
        saveBillingItem={saveBillingItem}
        canManageBilling={canManageBilling}
      />
      <InvoicingGlosasPanel
        selectedBilling={selectedBilling}
        setSelectedBilling={setSelectedBilling}
        setGlosaDraft={setGlosaDraft}
        setRecursoDraft={setRecursoDraft}
        setConfirmAction={setConfirmAction}
        session={session}
        canManageBilling={canManageBilling}
        deleteGlosa={deleteGlosa}
        deleteRecursoGlosa={deleteRecursoGlosa}
      />
    </Modal>
  );
}
