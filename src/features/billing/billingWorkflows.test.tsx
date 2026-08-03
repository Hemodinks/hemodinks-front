import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAttendanceWorkflow } from './useAttendanceWorkflow';
import { useInvoicingWorkflow } from './invoicing/useInvoicingWorkflow';
import { usePriceWorkflow } from './usePriceWorkflow';
import { useReceivablesWorkflow } from './receivables/useReceivablesWorkflow';

const session = {
  token: 'token',
  user: { id: 7, nome: 'Médico' },
} as never;
const event = () => ({ preventDefault: vi.fn() }) as never;

describe('billing workflow hooks', () => {
  it('valida atendimento antes de chamar a mutação', () => {
    const setError = vi.fn();
    const run = vi.fn();
    const attendance = {
      atendimentoForm: { pacienteId: '' },
      procedimentos: [],
      setEditingAttendanceId: vi.fn(),
      setAtendimentoForm: vi.fn(),
      setProcedimentos: vi.fn(),
      setShowForm: vi.fn(),
    } as never;
    const { result } = renderHook(() =>
      useAttendanceWorkflow({
        session,
        isMedical: true,
        convenios: [],
        opmeFornecedores: [],
        attendance,
        run,
        setError,
        setConfirmAction: vi.fn(),
      }),
    );

    result.current.submit(event());

    expect(setError).toHaveBeenCalledWith('Selecione o paciente.');
    expect(run).not.toHaveBeenCalled();
  });

  it('preenche edição e confirmação de exclusão do faturamento', () => {
    const setFaturamentoForm = vi.fn();
    const setConfirmAction = vi.fn();
    const removeInvoice = vi.fn();
    const invoice = {
      id: 4,
      paciente: 'Paciente',
      atendimentoCirurgicoId: 2,
      competencia: '2026-07-01',
      numeroGuia: 'GUIA',
      numeroLote: null,
      observacao: null,
    } as never;
    const invoicing = {
      faturamentos: [invoice],
      setEditingBillingId: vi.fn(),
      setFaturamentoForm,
      setSelectedBilling: vi.fn(),
      removeInvoice,
    } as never;
    const { result } = renderHook(() =>
      useInvoicingWorkflow({
        session,
        invoicing,
        run: vi.fn(),
        setConfirmAction,
        setShowForm: vi.fn(),
      }),
    );

    result.current.edit(invoice);
    result.current.confirmDelete(invoice);

    expect(setFaturamentoForm).toHaveBeenCalledWith(
      expect.objectContaining({
        atendimentoCirurgicoId: '2',
        competencia: '2026-07',
        numeroGuia: 'GUIA',
      }),
    );
    const confirmation = setConfirmAction.mock.calls[0][0];
    confirmation.action();
    expect(removeInvoice).toHaveBeenCalledWith(4, 'token');
  });

  it('aplica filtros financeiros e atualiza página, títulos e resumo', async () => {
    const setContas = vi.fn();
    const setFinancePage = vi.fn();
    const setFinanceiroResumo = vi.fn();
    const searchReceivables = vi.fn().mockResolvedValue({
      items: [{ id: 1 }],
      page: 2,
      totalPages: 3,
      totalItems: 21,
    });
    const loadSummary = vi.fn().mockResolvedValue({ saldoAberto: 50 });
    const receivables = {
      financeFilters: {
        termo: 'Ana',
        competencia: '2026-07',
        vencimentoInicio: '',
        vencimentoFim: '',
        convenioId: '',
        medicoId: '',
        pacienteId: '',
        status: 'Aberto',
      },
      searchReceivables,
      loadSummary,
      setContas,
      setFinancePage,
      setFinanceiroResumo,
    } as never;
    const { result } = renderHook(() =>
      useReceivablesWorkflow({
        session,
        receivables,
        run: vi.fn(),
        setError: vi.fn(),
      }),
    );

    await act(() => result.current.applyFilters(2));

    expect(searchReceivables).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        termo: 'Ana',
        status: 'Aberto',
      }),
      'token',
    );
    expect(setContas).toHaveBeenCalledWith([{ id: 1 }]);
    expect(setFinancePage).toHaveBeenCalledWith({ page: 2, totalPages: 3, totalItems: 21 });
    expect(setFinanceiroResumo).toHaveBeenCalledWith({ saldoAberto: 50 });
  });

  it('salva e limpa o formulário de preço quando a operação termina', async () => {
    const saveProcedurePrice = vi.fn().mockResolvedValue({ id: 8 });
    const setEditingPriceId = vi.fn();
    const setPrice = vi.fn();
    const run = vi.fn(async (action) => {
      await action();
      return true;
    });
    const prices = {
      editingPriceId: null,
      price: {
        convenioId: '2',
        cbhpmCodigo: '10101012',
        valorNegociado: '150',
        percentualPrincipal: '100',
        percentualAuxiliar1: '30',
        percentualAuxiliar2: '20',
        vigenciaInicio: '2026-07-01',
        vigenciaFinal: '',
      },
      saveProcedurePrice,
      setEditingPriceId,
      setPrice,
    } as never;
    const { result } = renderHook(() =>
      usePriceWorkflow({
        session,
        prices,
        run,
        setConfirmAction: vi.fn(),
      }),
    );

    await act(() => result.current.submit(event()));

    expect(saveProcedurePrice).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ convenioId: 2, valorNegociado: 150 }),
      'token',
    );
    expect(setEditingPriceId).toHaveBeenCalledWith(null);
    expect(setPrice).toHaveBeenCalledWith(expect.objectContaining({ percentualPrincipal: '100' }));
  });
});
