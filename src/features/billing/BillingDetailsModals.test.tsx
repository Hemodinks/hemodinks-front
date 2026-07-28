import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { ContaReceber, Faturamento } from './billingDomainTypes';
import { AccountDetailsModal, InvoicingDetailsModal } from './BillingDetailsModals';

const session = {
  token: 'token',
  user: { id: 1, nome: 'Admin' },
} as AuthSession;

const account = {
  id: 1,
  numeroDocumento: 'TIT-1',
  descricao: 'Honorários',
  dataEmissao: '2026-07-01',
  dataVencimento: '2026-07-10',
  valorOriginal: 100,
  valorAjustado: 100,
  valorRecebido: 0,
  saldoAberto: 100,
  status: 'Pendente',
  recebimentos: [],
} as unknown as ContaReceber;

const invoice = {
  id: 2,
  paciente: 'Paciente Teste',
  numeroGuia: 'GUIA-2',
  status: 'Rascunho',
  valorApresentado: 100,
  valorGlosado: 0,
  valorGlosaRecuperada: 0,
  valorReconhecido: 100,
  itens: [],
  glosas: [],
} as unknown as Faturamento;

describe('BillingDetailsModals', () => {
  it('renders account totals and opens the cancellation form', () => {
    const setCancelReason = vi.fn();
    render(
      <AccountDetailsModal
        selectedAccount={account}
        accountDraft={null}
        setAccountDraft={vi.fn()}
        cancelReason=""
        setCancelReason={setCancelReason}
        setSelectedAccount={vi.fn()}
        saveAccount={vi.fn()}
        cancelAccount={vi.fn()}
        downloadReceipt={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'TIT-1' })).toBeInTheDocument();
    expect(screen.getByText('Saldo atualizado')).toBeInTheDocument();
    expect(screen.getByText('Nenhum recebimento lançado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar título' }));
    expect(setCancelReason).toHaveBeenCalledWith(' ');
  });

  it('creates a confirmation action before deleting a draft invoice', () => {
    const setConfirmAction = vi.fn();
    render(
      <InvoicingDetailsModal
        selectedBilling={invoice}
        setSelectedBilling={vi.fn()}
        billingItemDraft={null}
        setBillingItemDraft={vi.fn()}
        setGlosaDraft={vi.fn()}
        setRecursoDraft={vi.fn()}
        setConfirmAction={setConfirmAction}
        saveBillingItem={vi.fn()}
        session={session}
        canManageBilling
        editBilling={vi.fn()}
        deleteFaturamento={vi.fn()}
        deleteGlosa={vi.fn()}
        deleteRecursoGlosa={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Paciente Teste — GUIA-2',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir faturamento' }));

    expect(setConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Excluir faturamento',
        success: 'Faturamento excluído.',
      }),
    );
  });
});
