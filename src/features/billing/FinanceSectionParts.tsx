import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button, DataPanel, IconButton } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { ContaReceber, FinanceiroResumo } from '../../types';
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
      <Summary title="Recebimentos do período" value={formatCurrency(resumo?.recebimentosPeriodo ?? 0)} />
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
  return (
    <DataPanel className="billing-table-panel billing-finance-titles-panel">
      <div className="billing-section-heading">
        <div><span className="eyebrow">Financeiro</span><h3>Títulos faturados</h3></div>
      </div>
      <div className="table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              <th>Documento</th><th>Paciente</th><th>Vencimento</th>
              <th>Original</th><th>Recebido</th><th>Saldo</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((account) => (
              <tr key={account.id}>
                <td data-label="Documento">
                  <Button onClick={() => onSelectAccount(account)}>{account.numeroDocumento}</Button>
                </td>
                <td data-label="Paciente">{account.paciente}</td>
                <td data-label="Vencimento">
                  {new Date(account.dataVencimento).toLocaleDateString('pt-BR')}
                  {account.status === 'Vencido' && <span className="status-pill warning">Em atraso</span>}
                </td>
                <td data-label="Original">{formatCurrency(account.valorOriginal)}</td>
                <td data-label="Recebido">{formatCurrency(account.valorRecebido)}</td>
                <td data-label="Saldo">{formatCurrency(account.saldoAberto)}</td>
                <td data-label="Status / ações">
                  <span className="status-pill active">{formatStatus(account.status)}</span>
                  {account.recebimentos.filter((item) => !item.estornado).map((item) => (
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
      <div className="billing-filter-actions">
        <Button disabled={page.page <= 1} onClick={() => onApplyFilters(page.page - 1)}>
          <ChevronLeft size={16} /> Anterior
        </Button>
        <span>{page.totalItems} título(s) — página {page.page} de {page.totalPages}</span>
        <Button disabled={page.page >= page.totalPages} onClick={() => onApplyFilters(page.page + 1)}>
          Próxima <ChevronRight size={16} />
        </Button>
      </div>
    </DataPanel>
  );
}
