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

  it('edita título estornado e baixa o comprovante do recebimento', () => {
    const setAccountDraft = vi.fn();
    const downloadReceipt = vi.fn().mockResolvedValue(undefined);
    const accountWithReceipt = {
      ...account,
      recebimentos: [
        {
          id: 8,
          dataRecebimento: '2026-07-08T12:00:00Z',
          formaRecebimento: 'PIX',
          valorRecebido: 100,
          estornado: true,
          motivoEstorno: 'Duplicado',
          documentoComprovante: 'receipt.pdf',
        },
      ],
    } as unknown as ContaReceber;

    render(
      <AccountDetailsModal
        selectedAccount={accountWithReceipt}
        accountDraft={null}
        setAccountDraft={setAccountDraft}
        cancelReason=""
        setCancelReason={vi.fn()}
        setSelectedAccount={vi.fn()}
        saveAccount={vi.fn()}
        cancelAccount={vi.fn()}
        downloadReceipt={downloadReceipt}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar título' }));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar' }));

    expect(setAccountDraft).toHaveBeenCalledWith(
      expect.objectContaining({ numeroDocumento: 'TIT-1', valorOriginal: '100' }),
    );
    expect(screen.getByText('Estornado — Duplicado')).toBeInTheDocument();
    expect(downloadReceipt).toHaveBeenCalledWith(8);
  });

  it('permite salvar a edição e confirmar o cancelamento', () => {
    const saveAccount = vi.fn((event) => event.preventDefault());
    const cancelAccount = vi.fn((event) => event.preventDefault());
    const accountDraft = {
      numeroDocumento: 'TIT-1',
      descricao: 'Honorários',
      dataEmissao: '2026-07-01',
      dataVencimento: '2026-07-10',
      valorOriginal: '100',
      valorAjustado: '100',
      observacao: '',
    };

    render(
      <AccountDetailsModal
        selectedAccount={account}
        accountDraft={accountDraft}
        setAccountDraft={vi.fn()}
        cancelReason="A pedido do paciente"
        setCancelReason={vi.fn()}
        setSelectedAccount={vi.fn()}
        saveAccount={saveAccount}
        cancelAccount={cancelAccount}
        downloadReceipt={vi.fn()}
      />,
    );

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar título' }).closest('form')!);
    fireEvent.submit(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }).closest('form')!,
    );

    expect(saveAccount).toHaveBeenCalledOnce();
    expect(cancelAccount).toHaveBeenCalledOnce();
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
