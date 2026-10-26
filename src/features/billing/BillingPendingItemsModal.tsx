import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Modal } from '../../shared/components/Modal';
import { IconButton } from '../../shared/components/ui';
import { BillingChecklist } from './BillingPageComponents';
import type { BillingRecord } from './billingTypes';

export const CHECKLIST_COUNT_DESCRIPTION = 'Quantidade de itens cadastrais, documentais ou operacionais do checklist; não representa atendimentos ou pagamentos em aberto.';

export function BillingPendingItemsModal({ records, individual = false, onClose }: {
  records: BillingRecord[];
  individual?: boolean;
  onClose: () => void;
}) {
  const pendingRecords = records.filter((record) => record.pendingChecklistItems > 0);
  const renderRecord = (record: BillingRecord) => (
    <>
      <p>Atendimento #{record.id} · {record.surgeryDateLabel} · {record.hospitalName}</p>
      <p>Status financeiro: <strong>{record.statusLabel}</strong></p>
      <p>{record.status === 'paid'
        ? 'Pagamentos pendentes: 0'
        : record.status === 'pending' ? 'Pagamento pendente de quitação declarada' : 'Sem valor informado; quitação não declarada'}</p>
      <p>Natureza dos itens abaixo: checklist cadastral/documental/operacional.</p>
      <BillingChecklist items={record.billingChecklist.filter((item) => item.status !== 'ok')} />
      {!record.pendingChecklistItems && <p>Nenhuma pendência encontrada no checklist.</p>}
    </>
  );
  return createPortal(
    <Modal titleId="billing-pending-title" descriptionId="billing-pending-description" className="billing-pending-modal" backdropClassName="billing-pending-backdrop" onClose={onClose}>
      <div className="panel-title">
        <h2 id="billing-pending-title">Itens pendentes do checklist</h2>
        <IconButton label="Fechar itens pendentes do checklist" title="Fechar" onClick={onClose}><X size={18} /></IconButton>
      </div>
      <p id="billing-pending-description">{CHECKLIST_COUNT_DESCRIPTION}</p>
      {individual ? records.map((record) => (
        <section key={record.id} aria-label={`Checklist de ${record.patientName}`}>
          <h3>{record.patientName}</h3>{renderRecord(record)}
        </section>
      )) : <>
        <p>{pendingRecords.length} atendimento(s) com checklist incompleto no filtro atual. Abra um atendimento para ver os motivos.</p>
        {pendingRecords.map((record) => (
          <details key={record.id} className="billing-pending-record">
            <summary tabIndex={0}>{record.patientName} · #{record.id} · {record.pendingChecklistItems} itens pendentes do checklist</summary>
            {renderRecord(record)}
          </details>
        ))}
        {!pendingRecords.length && <p>Nenhuma pendência encontrada no checklist.</p>}
      </>}
    </Modal>, document.body,
  );
}
