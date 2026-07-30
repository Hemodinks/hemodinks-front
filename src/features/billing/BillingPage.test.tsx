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

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('cadastra atendimento com procedimento selecionado, autorização, médico e hospital', async () => {
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
    const attachment = new File(['laudo'], 'laudo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Selecionar arquivos'), {
      target: { files: [attachment] },
    });
    fireEvent.change(screen.getByLabelText('Paciente'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data da cirurgia'), {
      target: { value: '2026-07-10' },
    });
    fireEvent.change(screen.getByLabelText('Hospital'), {
      target: { value: 'Hospital Teste' },
    });
    fireEvent.change(screen.getByLabelText('Fornecedor OPME'), {
      target: { value: 'Promedom' },
    });
    fireEvent.change(screen.getByLabelText('Médico responsável'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    fireEvent.change(screen.getByLabelText('Autorização'), {
      target: { value: 'AUT-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));
    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          pacienteId: 1,
          hospitalId: 1,
          opmeFornecedorId: 1,
          medicoResponsavelId: 2,
          numeroAutorizacao: 'AUT-1',
          procedimentos: [
            expect.objectContaining({
              cbhpmCodigo: '123',
              pesoPercentual: 100,
            }),
          ],
        }),
        'token',
      ),
    );
    await waitFor(() =>
      expect(services.uploadAtendimentoArquivo).toHaveBeenCalledWith(1, attachment, 'token'),
    );
  });

  it('cadastra hospital, convênio e fornecedor OPME informados manualmente', async () => {
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
    fireEvent.change(screen.getByLabelText('Paciente'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data da cirurgia'), {
      target: { value: '2026-07-10' },
    });
    fireEvent.change(screen.getByLabelText('Hospital'), {
      target: { value: 'Hospital Novo' },
    });
    fireEvent.change(screen.getByLabelText('Convênio'), {
      target: { value: 'Convênio Novo' },
    });
    fireEvent.change(screen.getByLabelText('Fornecedor OPME'), {
      target: { value: 'Fornecedor Novo' },
    });
    fireEvent.change(screen.getByLabelText('Médico responsável'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));

    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          hospitalId: null,
          hospital: 'Hospital Novo',
          convenioId: null,
          convenio: 'Convênio Novo',
          opmeFornecedorId: null,
          opmeFornecedor: 'Fornecedor Novo',
        }),
        'token',
      ),
    );
  });

  it('registra valor e motivo da glosa no atendimento', async () => {
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
    fireEvent.change(screen.getByLabelText('Paciente'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data da cirurgia'), {
      target: { value: '2026-07-10' },
    });
    fireEvent.change(screen.getByLabelText('Médico responsável'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    fireEvent.change(screen.getByLabelText('Valor da glosa'), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByLabelText('Motivo da glosa'), {
      target: { value: 'Divergência contratual' },
    });
    fireEvent.change(screen.getByLabelText('Observações'), {
      target: { value: 'Conferir documentação antes do faturamento.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));

    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          valorGlosa: 150,
          motivoGlosa: 'Divergência contratual',
          observacao: 'Conferir documentação antes do faturamento.',
        }),
        'token',
      ),
    );
  });

  it('permite editar e excluir um atendimento', async () => {
    renderPage();
    await screen.findByText('Paciente Teste');

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Paciente')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText('Autorização'), {
      target: { value: 'AUT-EDITADA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar atendimento' }));
    await waitFor(() =>
      expect(services.updateAtendimento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ numeroAutorizacao: 'AUT-EDITADA' }),
        'token',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(services.deleteAtendimento).toHaveBeenCalledWith(1, 'token'));
  });

  it('abre os procedimentos pelo ícone informativo', async () => {
    renderPage();
    await screen.findByText('Paciente Teste');

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver procedimentos de Paciente Teste' }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Paciente Teste' })).toBeInTheDocument();
    expect(within(dialog).getByText('123')).toBeInTheDocument();
    expect(within(dialog).getByText('Cirurgia')).toBeInTheDocument();
  });

  it('pagina os atendimentos em grupos de dez registros', async () => {
    vi.mocked(services.getAtendimentos).mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        ...atendimento,
        id: index + 1,
        paciente: `Paciente paginado ${index + 1}`,
      })) as never,
    );

    renderPage();

    expect(await screen.findByRole('button', { name: 'Paciente paginado 11' })).toBeInTheDocument();
    expect(screen.getByText('1-10 de 11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente paginado 1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página de atendimentos' }));

    expect(await screen.findByRole('button', { name: 'Paciente paginado 1' })).toBeInTheDocument();
    expect(screen.getByText('11-11 de 11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente paginado 11' })).not.toBeInTheDocument();
  });

  it('filtra atendimentos por paciente, data e status', async () => {
    vi.mocked(services.getAtendimentos).mockResolvedValue([
      {
        ...atendimento,
        id: 1,
        paciente: 'Paciente Alfa',
        dataProcedimento: '2026-07-10',
        status: 'Realizado',
      },
      {
        ...atendimento,
        id: 2,
        paciente: 'Paciente Beta',
        dataProcedimento: '2026-07-11',
        status: 'Autorizado',
      },
    ] as never);

    renderPage();
    await screen.findByRole('button', { name: 'Paciente Alfa' });

    fireEvent.change(screen.getByLabelText('Nome do paciente'), { target: { value: 'Beta' } });
    expect(screen.getByRole('button', { name: 'Paciente Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente Alfa' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    fireEvent.change(screen.getByLabelText('Data do atendimento'), {
      target: { value: '2026-07-10' },
    });
    expect(screen.getByRole('button', { name: 'Paciente Alfa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente Beta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    fireEvent.change(
      screen.getByRole('combobox', { name: /^Status do atendimento$/ }),
      { target: { value: 'Autorizado' } },
    );
    expect(screen.getByRole('button', { name: 'Paciente Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Paciente Alfa' })).not.toBeInTheDocument();
  });

  it('ordena a listagem ao clicar no nome do cabeçalho', async () => {
    vi.mocked(services.getAtendimentos).mockResolvedValue([
      { ...atendimento, id: 1, paciente: 'Paciente Zeta' },
      { ...atendimento, id: 2, paciente: 'Paciente Alfa' },
    ] as never);

    renderPage();
    await screen.findByRole('button', { name: 'Paciente Zeta' });
    const table = screen.getByRole('table');

    fireEvent.click(within(table).getByRole('button', { name: 'Paciente' }));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Paciente Alfa');

    fireEvent.click(within(table).getByRole('button', { name: 'Paciente' }));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Paciente Zeta');
    for (const header of ['Data', 'Status']) {
      fireEvent.click(within(table).getByRole('button', { name: header }));
    }
    expect(within(table).queryByRole('button', { name: 'Procedimentos' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Ações' })).not.toBeInTheDocument();
  });

  it('limpa os campos depois de cadastrar um atendimento com sucesso', async () => {
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
    fireEvent.change(screen.getByLabelText('Paciente'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data da cirurgia'), {
      target: { value: '2026-07-10' },
    });
    fireEvent.change(screen.getByLabelText('Diagnóstico'), {
      target: { value: 'Diagnóstico anterior' },
    });
    fireEvent.change(screen.getByLabelText('Médico responsável'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));

    await waitFor(() => expect(screen.queryByLabelText('Paciente')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Novo atendimento/i }));

    expect(screen.getByLabelText('Paciente')).toHaveValue('');
    expect(screen.getByLabelText('Data da cirurgia')).toHaveValue('');
    expect(screen.getByLabelText('Diagnóstico')).toHaveValue('');
    expect(screen.queryByText('Cirurgia')).not.toBeInTheDocument();
  });

  it('remove automaticamente a mensagem de sucesso', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
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
      fireEvent.change(screen.getByLabelText('Paciente'), {
        target: { value: '1' },
      });
      fireEvent.change(screen.getByLabelText('Data da cirurgia'), {
        target: { value: '2026-07-10' },
      });
      fireEvent.change(screen.getByLabelText('Médico responsável'), {
        target: { value: '2' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Consultar CBHPM' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));

      expect(
        await screen.findByText('Atendimento criado com snapshot de preço.'),
      ).toBeInTheDocument();
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        vi.advanceTimersByTime(10001);
      });
      expect(
        screen.queryByText('Atendimento criado com snapshot de preço.'),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
