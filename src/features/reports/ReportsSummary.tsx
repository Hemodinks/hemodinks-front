import { CheckCircle2, ClipboardList, PackageSearch, ReceiptText, TriangleAlert, Wallet } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/formatters';
import { BillingSummaryCard } from '../billing/BillingPageComponents';
import type { ReportSummary } from './reportTypes';

export function ReportsSummary({ summary, pendingItemsCount, onOpenChecklist }: { summary: ReportSummary; pendingItemsCount: number; onOpenChecklist: () => void }) {
  return (
    <section className="billing-summary-grid" aria-label="Indicadores dos relatórios" data-tour="reports-summary">
      <BillingSummaryCard title="Valor faturado" value={formatCurrency(summary.totalGrossAmount)} caption={`${summary.totalRecords} atendimento(s) no período`} tone="gross" icon={<Wallet size={18} />} />
      <BillingSummaryCard title="Valor líquido" value={formatCurrency(summary.totalNetAmount)} caption="Faturado menos glosas informadas" tone="net" icon={<ReceiptText size={18} />} />
      <BillingSummaryCard title="Glosas" value={formatCurrency(summary.totalGlosaAmount)} caption={`${summary.glosaCasesCount} atendimento(s) com glosa`} tone="glosa" icon={<TriangleAlert size={18} />} />
      <BillingSummaryCard title="Atendimentos" value={String(summary.totalRecords)} caption={`${summary.particularCount} particulares | ${summary.convenioCount} convênios`} tone="records" icon={<ClipboardList size={18} />} />
      <BillingSummaryCard title="Pagamentos pendentes" value={String(summary.pendingCount)} caption={`${summary.paidCount} pagos | ${summary.missingAmountCount} sem valor informado`} tone="paid" icon={<CheckCircle2 size={18} />} />
      <BillingSummaryCard title="Atendimentos com checklist incompleto" value={String(summary.recordsWithPendingItems)} caption={`${pendingItemsCount} itens pendentes do checklist · Ver motivos`} tone="attention" icon={<ClipboardList size={18} />} onClick={onOpenChecklist} />
      <BillingSummaryCard title="OPME" value={String(summary.opmeCount)} caption={`${summary.attachmentCount} atendimento(s) com anexos`} tone="attention" icon={<PackageSearch size={18} />} />
    </section>
  );
}
