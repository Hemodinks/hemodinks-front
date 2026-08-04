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

describe('BillingPage invoicing details', () => {
  beforeEach(() => {
    setupMocks();
    vi.mocked(receiptDocument.downloadGeneratedReceipt).mockResolvedValue(undefined);
  });

  it('envia explicitamente um faturamento depois de preparar', async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([
      { ...draft, status: 'ProntoParaEnvio' },
    ]);
    renderPage('faturamento');
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar faturamento' }));
    await waitFor(() =>
      expect(services.updateFaturamentoStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'Enviado' }),
        'token',
      ),
    );
  });

  it('edita glosa e recurso pela tela de detalhe', async () => {
    const withAppeal = {
      ...draft,
      status: 'GlosadoParcial',
      valorGlosado: 200,
      valorReconhecido: 700,
      glosas: [
        {
          id: 7,
          faturamentoItemId: 1,
          codigoMotivo: 'M1',
          descricaoMotivo: 'Divergência',
          valorGlosado: 200,
          dataGlosa: '2026-07-12',
          status: 'ComRecurso',
          observacao: null,
          recursos: [
            {
              id: 8,
              dataEnvio: '2026-07-13',
              justificativa: 'Documentação comprobatória',
              valorRecorrido: 200,
              dataResposta: null,
              valorRecuperado: 0,
              status: 'Enviado',
              observacao: null,
            },
          ],
        },
      ],
    } as Faturamento;
    vi.mocked(services.getFaturamentos).mockResolvedValue([withAppeal]);
    vi.mocked(services.updateGlosa).mockResolvedValue(withAppeal);
    vi.mocked(services.updateRecursoGlosa).mockResolvedValue(withAppeal);
    renderPage('faturamento');
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Paciente Teste' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar glosa' }));
    fireEvent.change(screen.getByLabelText('Descrição do motivo'), {
      target: { value: 'Divergência revisada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar glosa' }));
    await waitFor(() =>
      expect(services.updateGlosa).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ descricaoMotivo: 'Divergência revisada' }),
        'token',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Paciente Teste' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar recurso' }));
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'Aceito' },
    });
    fireEvent.change(screen.getByLabelText('Valor recuperado'), {
      target: { value: '200' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar recurso' }));
    await waitFor(() =>
      expect(services.updateRecursoGlosa).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ status: 'Aceito', valorRecuperado: 200 }),
        'token',
      ),
    );
  });

  it('mantém a geração de título idempotente ao repetir a ação', async () => {
    vi.mocked(services.getFaturamentos).mockResolvedValue([{ ...draft, status: 'Aprovado' }]);
    renderPage('faturamento');
    await screen.findByText('Paciente Teste');
    fireEvent.click(screen.getByRole('button', { name: /Gerar título/ }));
    await waitFor(() => expect(services.gerarContaReceber).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /Gerar título/ }));
    await waitFor(() => expect(services.gerarContaReceber).toHaveBeenCalledTimes(2));
    expect(vi.mocked(services.gerarContaReceber).mock.calls[0][0]).toBe(
      vi.mocked(services.gerarContaReceber).mock.calls[1][0],
    );
    expect(vi.mocked(services.gerarContaReceber).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        faturamentoId: 1,
        numeroDocumento: 'FAT-1-01',
      }),
    );
    expect(vi.mocked(services.gerarContaReceber).mock.calls[1][1]).toEqual(
      expect.objectContaining({
        faturamentoId: 1,
        numeroDocumento: 'FAT-1-01',
      }),
    );
  });
});
