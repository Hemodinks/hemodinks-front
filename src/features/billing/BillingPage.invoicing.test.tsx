import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContaReceber, Faturamento } from './billingDomainTypes';
import * as services from '../../services';
import * as receiptDocument from './receiptDocument';
import {
  atendimento,
  billingPage as page,
  conta,
  draft,
  renderBillingPage as renderPage,
  session,
  setupBillingMocks as setupMocks,
} from './billingTestSetup';

vi.mock('../../services', async () => {
  const { createBillingServicesMock } = await import('./billingServicesMock');
  return createBillingServicesMock();
});
vi.mock('./receiptDocument', () => ({
  downloadGeneratedReceipt: vi.fn(),
}));

describe('BillingPage invoicing', () => {
  beforeEach(() => {
    setupMocks();
    vi.mocked(receiptDocument.downloadGeneratedReceipt).mockResolvedValue(undefined);
  });

  it('limpa os dados do formulário após gerar o faturamento', async () => {
    renderPage('faturamento');

    fireEvent.click(await screen.findByRole('button', { name: /Novo faturamento/i }));
    fireEvent.change(screen.getByLabelText('Atendimento'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Número da guia'), {
      target: { value: 'GUIA-123' },
    });
    fireEvent.change(screen.getByLabelText('Número do lote'), {
      target: { value: 'LOTE-456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar itens do faturamento' }));

    await waitFor(() =>
      expect(services.createFaturamento).toHaveBeenCalledWith(
        expect.objectContaining({
          atendimentoCirurgicoId: 1,
          numeroGuia: 'GUIA-123',
          numeroLote: 'LOTE-456',
        }),
        'token',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /Novo faturamento/i }));
    expect(screen.getByLabelText('Atendimento')).toHaveValue('');
    expect(screen.getByLabelText('Número da guia')).toHaveValue('');
    expect(screen.getByLabelText('Número do lote')).toHaveValue('');
  });

  it('permite editar e excluir faturamento em rascunho', async () => {
    renderPage('faturamento');
    await screen.findByText('Paciente Teste');

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Número da guia'), {
      target: { value: 'GUIA-EDITADA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar faturamento' }));
    await waitFor(() =>
      expect(services.updateFaturamento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          numeroGuia: 'GUIA-EDITADA',
          rowVersion: draft.rowVersion,
        }),
        'token',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(services.deleteFaturamento).toHaveBeenCalledWith(1, 'token'));
  });

  it('pagina os faturamentos em grupos de dez registros', async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        ...draft,
        id: index + 1,
        paciente: `Faturamento paginado ${index + 1}`,
      })),
    );

    renderPage('faturamento');

    expect(
      await screen.findByRole('button', { name: 'Faturamento paginado 11' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1-10 de 11')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Faturamento paginado 1' }),
    ).not.toBeInTheDocument();
    const table = screen.getByRole('table');
    for (const header of ['Paciente', 'Guia', 'Apresentado', 'Glosa', 'Reconhecido', 'Status']) {
      fireEvent.click(within(table).getByRole('button', { name: header }));
    }

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página de faturamentos' }));

    expect(
      await screen.findByRole('button', { name: 'Faturamento paginado 11' }),
    ).toBeInTheDocument();
    expect(screen.getByText('11-11 de 11')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Faturamento paginado 1' }),
    ).not.toBeInTheDocument();
  });

  it('filtra faturamentos por paciente, guia e status', async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([
      {
        ...draft,
        id: 1,
        paciente: 'Paciente Alfa',
        numeroGuia: 'GUIA-ALFA',
        status: 'Rascunho',
      },
      {
        ...draft,
        id: 2,
        paciente: 'Paciente Beta',
        numeroGuia: 'GUIA-BETA',
        status: 'ParcialmentePago',
      },
    ]);

    renderPage('faturamento');
    await screen.findByRole('button', { name: 'Paciente Alfa' });

    fireEvent.change(screen.getByLabelText('Nome do paciente'), { target: { value: 'Beta' } });
    expect(screen.getByRole('button', { name: 'Paciente Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente Alfa' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    fireEvent.change(screen.getByLabelText('Guia'), { target: { value: 'GUIA-ALFA' } });
    expect(screen.getByRole('button', { name: 'Paciente Alfa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente Beta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    fireEvent.change(
      screen.getByRole('combobox', { name: /^Status do faturamento$/ }),
      { target: { value: 'ParcialmentePago' } },
    );
    expect(screen.getByRole('button', { name: 'Paciente Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente Alfa' })).not.toBeInTheDocument();
  });

  it('não transporta mensagens de sucesso para outro módulo', async () => {
    const view = renderPage('faturamento');

    fireEvent.click(await screen.findByRole('button', { name: /Novo faturamento/i }));
    fireEvent.change(screen.getByLabelText('Atendimento'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar itens do faturamento' }));

    expect(
      await screen.findByText('Faturamento criado a partir do atendimento.'),
    ).toBeInTheDocument();

    view.rerender(page('financeiro'));

    expect(
      screen.queryByText('Faturamento criado a partir do atendimento.'),
    ).not.toBeInTheDocument();
  });

  it('exibe snapshot e permite editar item somente no rascunho', async () => {
    renderPage('faturamento');
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Paciente Teste' }));
    expect(screen.getByText('Detalhe do faturamento')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /Paciente Teste/ })).toHaveClass(
      'billing-wide-modal',
      'billing-invoice-detail-modal',
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: /Paciente Teste/ })).getByRole('button', {
        name: 'Editar item',
      }),
    );
    fireEvent.change(screen.getByLabelText('Valor unitário'), {
      target: { value: '850' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar item' }));
    await waitFor(() =>
      expect(services.updateFaturamentoItem).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ valorUnitario: 850 }),
        'token',
      ),
    );
  });

  it('abre o retorno em modal largo e organiza a glosa por procedimento', async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([{ ...draft, status: 'Enviado' }]);

    renderPage('faturamento');

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar retorno' }));

    const dialog = screen.getByRole('dialog', {
      name: 'Registrar retorno do faturamento',
    });
    expect(dialog).toHaveClass('billing-wide-modal', 'billing-return-modal');
    expect(screen.getByText('Procedimento 1')).toBeInTheDocument();
    expect(screen.getByText('Sem glosa para este procedimento')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Valor da glosa'), {
      target: { value: '100' },
    });

    expect(screen.getByLabelText('Motivo da glosa')).toBeInTheDocument();
  });
});
