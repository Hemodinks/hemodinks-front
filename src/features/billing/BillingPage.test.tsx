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
    fireEvent.click(screen.getByRole('button', { name: 'Salvar atendimento' }));

    await waitFor(() =>
      expect(services.createAtendimento).toHaveBeenCalledWith(
        expect.objectContaining({
          valorGlosa: 150,
          motivoGlosa: 'Divergência contratual',
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
