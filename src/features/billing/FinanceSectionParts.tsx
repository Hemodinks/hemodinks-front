import { RotateCcw } from 'lucide-react';
import { Button, DataPanel, IconButton } from '../../shared/components/ui';
import { Pagination, SortableHeader } from '../../shared/components/listing';
import { useSortableData } from '../../shared/hooks/useSortableData';
import { formatCurrency } from '../../shared/utils/formatters';
import type { ContaReceber, FinanceiroResumo } from './billingDomainTypes';
import type { FinancePageState } from './billingPageTypes';

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <DataPanel>
      <span className="eyebrow">{title}</span>
      <strong className="billing-summary-value">{value}</strong>
    </DataPanel>
  );
}

function formatStatus(status: string) {
  return status.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, '$1 $2');
}

export function FinanceSummaryCards({
  resumo,
  received,
  openBalance,
}: {
  resumo: FinanceiroResumo | null;
  received: number;
  openBalance: number;
}) {
  return (
    <section className="billing-summary-grid">
      <Summary title="Total previsto" value={formatCurrency(resumo?.valorReconhecido ?? 0)} />
      <Summary title="Total recebido" value={formatCurrency(resumo?.valorRecebido ?? received)} />
      <Summary title="Saldo em aberto" value={formatCurrency(resumo?.saldoAberto ?? openBalance)} />
      <Summary title="Total vencido" value={formatCurrency(resumo?.valorVencido ?? 0)} />
      <Summary
        title="Recebimentos do período"
        value={formatCurrency(resumo?.recebimentosPeriodo ?? 0)}
      />
    </section>
  );
}

export function FinanceAccountsTable({
  contas,
  page,
  onApplyFilters,
  onSelectAccount,
  onOpenReversal,
}: {
  contas: ContaReceber[];
  page: FinancePageState;
  onApplyFilters: (page: number) => void;
  onSelectAccount: (account: ContaReceber) => void;
  onOpenReversal: (id: number, valor: number) => void;
}) {
  const sorting = useSortableData(contas, {
    documento: (item) => item.numeroDocumento,
    paciente: (item) => item.paciente,
    vencimento: (item) => item.dataVencimento,
    original: (item) => item.valorOriginal,
    recebido: (item) => item.valorRecebido,
    saldo: (item) => item.saldoAberto,
    status: (item) => item.status,
  });

  return (
    <DataPanel className="billing-table-panel billing-finance-titles-panel">
      <div className="billing-section-heading">
        <div>
          <span className="eyebrow">Financeiro</span>
          <h3>Títulos faturados</h3>
        </div>
      </div>
      <div className="table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              {[
                ['documento', 'Documento'],
                ['paciente', 'Paciente'],
                ['vencimento', 'Vencimento'],
                ['original', 'Original'],
                ['recebido', 'Recebido'],
                ['saldo', 'Saldo'],
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
            </tr>
          </thead>
          <tbody>
            {sorting.sortedItems.map((account) => (
              <tr key={account.id}>
                <td data-label="Documento">
                  <Button onClick={() => onSelectAccount(account)}>
                    {account.numeroDocumento}
                  </Button>
                </td>
                <td data-label="Paciente">{account.paciente}</td>
                <td data-label="Vencimento">
                  {new Date(account.dataVencimento).toLocaleDateString('pt-BR')}
                  {account.status === 'Vencido' && (
                    <span className="status-pill warning">Em atraso</span>
                  )}
                </td>
                <td data-label="Original">{formatCurrency(account.valorOriginal)}</td>
                <td data-label="Recebido">{formatCurrency(account.valorRecebido)}</td>
                <td data-label="Saldo">{formatCurrency(account.saldoAberto)}</td>
                <td data-label="Status / ações">
                  <span className="status-pill active">{formatStatus(account.status)}</span>
                  {account.recebimentos
                    .filter((item) => !item.estornado)
                    .map((item) => (
                      <IconButton
                        key={item.id}
                        label={`Estornar recebimento de ${formatCurrency(item.valorRecebido)}`}
                        title={`Estornar ${formatCurrency(item.valorRecebido)}`}
                        tone="danger"
                        onClick={() => onOpenReversal(item.id, item.valorRecebido)}
                      >
                        <RotateCcw size={16} />
                      </IconButton>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        entityLabel="títulos financeiros"
        visibleStart={page.totalItems ? (page.page - 1) * 10 + 1 : 0}
        visibleEnd={Math.min(page.page * 10, page.totalItems)}
        totalItems={page.totalItems}
        currentPage={page.page}
        totalPages={Math.max(1, page.totalPages)}
        onPageChange={(nextPage) =>
          onApplyFilters(typeof nextPage === 'function' ? nextPage(page.page) : nextPage)
        }
      />
    </DataPanel>
  );
}
