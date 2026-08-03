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

describe('BillingPage prices and CBHPM', () => {
  beforeEach(() => {
    setupMocks();
    vi.mocked(receiptDocument.downloadGeneratedReceipt).mockResolvedValue(undefined);
  });

  it('limpa o formulário de preço depois de salvar com sucesso', async () => {
    vi.mocked(services.saveConvenioProcedimentoPreco).mockResolvedValue({
      id: 1,
      convenioId: 1,
      cbhpmCodigo: '40710108',
      valorNegociado: 200,
      percentualPrincipal: 100,
      percentualAuxiliar1: 0,
      percentualAuxiliar2: 0,
      vigenciaInicio: '2026-07-24',
      vigenciaFinal: '2026-07-30',
      ativo: true,
    });
    renderPage('precos');

    await screen.findByRole('button', { name: 'Salvar preço' });
    fireEvent.change(screen.getByLabelText('Convênio'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Código CBHPM'), {
      target: { value: '40710108' },
    });
    fireEvent.change(screen.getByLabelText('Valor negociado'), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByLabelText('Vigência inicial'), {
      target: { value: '2026-07-24' },
    });
    fireEvent.change(screen.getByLabelText('Vigência final'), {
      target: { value: '2026-07-30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preço' }));

    await waitFor(() =>
      expect(services.saveConvenioProcedimentoPreco).toHaveBeenCalledWith(
        expect.objectContaining({
          convenioId: 1,
          cbhpmCodigo: '40710108',
          valorNegociado: 200,
        }),
        'token',
      ),
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Convênio')).toHaveValue('');
      expect(screen.getByLabelText('Código CBHPM')).toHaveValue('');
      expect(screen.getByLabelText('Valor negociado')).toHaveValue(null);
      expect(screen.getByLabelText('Vigência final')).toHaveValue('');
    });
  });

  it('ordena todas as colunas textuais da tabela de preços', async () => {
    vi.mocked(services.getConvenioProcedimentoPrecos).mockResolvedValue([
      {
        id: 1,
        convenioId: 1,
        cbhpmCodigo: '20',
        valorNegociado: 200,
        percentualPrincipal: 100,
        percentualAuxiliar1: 0,
        percentualAuxiliar2: 0,
        vigenciaInicio: '2026-08-01',
        ativo: true,
      },
      {
        id: 2,
        convenioId: 1,
        cbhpmCodigo: '10',
        valorNegociado: 100,
        percentualPrincipal: 100,
        percentualAuxiliar1: 0,
        percentualAuxiliar2: 0,
        vigenciaInicio: '2026-07-01',
        ativo: true,
      },
    ]);

    renderPage('precos');
    const table = await screen.findByRole('table');

    for (const header of ['Convênio', 'CBHPM', 'Valor', 'Vigência']) {
      fireEvent.click(within(table).getByRole('button', { name: header }));
    }

    expect(within(table).queryByRole('button', { name: 'Status / ações' })).not.toBeInTheDocument();
  });

  it('exibe o procedimento selecionado sem informações de preço', async () => {
    vi.mocked(services.getCbhpmGeral).mockResolvedValue({
      items: [
        {
          id: 1,
          codigo: '123',
          procedimento: 'Cirurgia',
          porte: '8A',
          valorReferencia: 1000,
        },
      ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    renderPage();
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: /Novo atendimento/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
    expect(
      await screen.findByRole('dialog', { name: 'Consultar procedimentos' }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    expect(screen.getByText('Cirurgia')).toBeInTheDocument();
    expect(screen.getByText('8A')).toBeInTheDocument();
    expect(screen.getByText('Valor de referência: R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover Cirurgia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pré-visualizar preço' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Preço que será preservado/)).not.toBeInTheDocument();
  });

  it('filtra e pagina os procedimentos CBHPM dentro do popup', async () => {
    vi.mocked(services.getCbhpmGeral).mockImplementation(async (_token, query) => ({
      items: [
        {
          id: query?.page ?? 1,
          codigo: query?.page === 2 ? '456' : '123',
          procedimento: query?.page === 2 ? 'Cirurgia complementar' : 'Cirurgia',
          porte: '8A',
          valorReferencia: 1000,
        },
      ],
      page: query?.page ?? 1,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    }));

    renderPage();
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: /Novo atendimento/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));

    await screen.findByRole('dialog', { name: 'Consultar procedimentos' });
    await waitFor(() =>
      expect(services.getCbhpmGeral).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({ page: 1, pageSize: 10 }),
      ),
    );

    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Descrição do procedimento'), {
      target: { value: 'Cirurgia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    await waitFor(() =>
      expect(services.getCbhpmGeral).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          page: 1,
          codigo: '123',
          procedimento: 'Cirurgia',
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() =>
      expect(services.getCbhpmGeral).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          page: 2,
          codigo: '123',
          procedimento: 'Cirurgia',
        }),
      ),
    );
    expect(await screen.findByText('Cirurgia complementar')).toBeInTheDocument();
  });

  it('adiciona um procedimento manual pelo popup CBHPM', async () => {
    renderPage();
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: /Novo atendimento/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
    await screen.findByRole('dialog', { name: 'Consultar procedimentos' });

    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: '9.99.99.99-9' },
    });
    fireEvent.change(screen.getByLabelText('Descrição do procedimento'), {
      target: { value: 'Procedimento manual' },
    });
    fireEvent.change(screen.getByLabelText('Porte'), {
      target: { value: '2b' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar manualmente' }));

    expect(screen.getByText('99999999')).toBeInTheDocument();
    expect(screen.getByText('Procedimento manual')).toBeInTheDocument();
    expect(screen.getByText('2B')).toBeInTheDocument();
  });
});
