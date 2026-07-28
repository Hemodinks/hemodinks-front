import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as services from '../../services';
import { createInitialAtendimentoForm, useAttendances } from './useAttendances';
import { createInitialFaturamentoForm, useInvoicing } from './useInvoicing';
import { useReceivables } from './useReceivables';
import { createInitialPriceForm, useProcedurePrices } from './useProcedurePrices';

vi.mock('../../services', () => ({
  getAtendimentos: vi.fn(),
  getPacientes: vi.fn(),
  getHospitais: vi.fn(),
  createAtendimento: vi.fn(),
  updateAtendimento: vi.fn(),
  deleteAtendimento: vi.fn(),
  getFaturamentos: vi.fn(),
  createFaturamento: vi.fn(),
  updateFaturamento: vi.fn(),
  deleteFaturamento: vi.fn(),
  updateFaturamentoStatus: vi.fn(),
  gerarContaReceber: vi.fn(),
  registrarRetornoFaturamento: vi.fn(),
  registrarRecursoGlosa: vi.fn(),
  updateGlosa: vi.fn(),
  deleteGlosa: vi.fn(),
  updateRecursoGlosa: vi.fn(),
  deleteRecursoGlosa: vi.fn(),
  updateFaturamentoItem: vi.fn(),
  getContasReceber: vi.fn(),
  getFinanceiroResumo: vi.fn(),
  estornarRecebimento: vi.fn(),
  registrarRecebimento: vi.fn(),
  uploadComprovanteRecebimento: vi.fn(),
  searchContasReceber: vi.fn(),
  updateContaReceber: vi.fn(),
  cancelContaReceber: vi.fn(),
  downloadComprovanteRecebimento: vi.fn(),
  getConvenioProcedimentoPrecos: vi.fn(),
  saveConvenioProcedimentoPreco: vi.fn(),
  updateConvenioProcedimentoPreco: vi.fn(),
  deactivateConvenioProcedimentoPreco: vi.fn(),
}));

const token = 'token';
const attendance = { id: 1, paciente: 'Paciente' };
const patient = { id: 2, nomePaciente: 'Paciente' };
const hospital = { id: 3, nome: 'Hospital' };
const invoice = { id: 4, paciente: 'Paciente' };
const account = {
  id: 5,
  status: 'Pendente',
  saldoAberto: 80,
  valorRecebido: 20,
};
const summary = { saldoAberto: 80 };
const price = { id: 6, cbhpmCodigo: '10101012' };

describe('billing domain hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads attendances and delegates create, update and delete', async () => {
    vi.mocked(services.getAtendimentos).mockResolvedValue([attendance] as never);
    vi.mocked(services.getPacientes).mockResolvedValue({
      items: [patient],
    } as never);
    vi.mocked(services.getHospitais).mockResolvedValue([hospital]);

    const { result } = renderHook(() => useAttendances('9'));

    expect(result.current.atendimentoForm).toEqual(
      expect.objectContaining({ medicoResponsavelId: '9', quantidade: '1' }),
    );

    await act(() => result.current.loadAttendances(token));

    expect(result.current.atendimentos).toEqual([attendance]);
    expect(result.current.pacientes).toEqual([patient]);
    expect(result.current.hospitais).toEqual([hospital]);

    const payload = { pacienteId: 2 } as never;
    await result.current.saveAttendance(null, payload, token);
    await result.current.saveAttendance(1, payload, token);
    await result.current.removeAttendance(1, token);

    expect(services.createAtendimento).toHaveBeenCalledWith(payload, token);
    expect(services.updateAtendimento).toHaveBeenCalledWith(1, payload, token);
    expect(services.deleteAtendimento).toHaveBeenCalledWith(1, token);
  });

  it('loads invoicing and delegates its mutation boundary', async () => {
    vi.mocked(services.getAtendimentos).mockResolvedValue([attendance] as never);
    vi.mocked(services.getFaturamentos).mockResolvedValue([invoice] as never);

    const { result } = renderHook(() => useInvoicing());
    expect(result.current.faturamentoForm).toEqual(
      expect.objectContaining({ numeroGuia: '', observacao: '' }),
    );

    let loadedAttendances: unknown;
    await act(async () => {
      loadedAttendances = await result.current.loadInvoicing(token);
    });

    expect(loadedAttendances).toEqual([attendance]);
    expect(result.current.faturamentos).toEqual([invoice]);

    const invoicePayload = { atendimentoCirurgicoId: 1 } as never;
    await result.current.saveInvoice(null, invoicePayload, token);
    await result.current.saveInvoice(4, invoicePayload, token);
    await result.current.changeInvoiceStatus(4, { status: 'Enviado' } as never, token);
    await result.current.removeInvoice(4, token);
    await result.current.removeGlosa(7, token);
    await result.current.removeAppeal(8, token);

    expect(services.createFaturamento).toHaveBeenCalledWith(invoicePayload, token);
    expect(services.updateFaturamento).toHaveBeenCalledWith(4, invoicePayload, token);
    expect(services.updateFaturamentoStatus).toHaveBeenCalledWith(4, { status: 'Enviado' }, token);
    expect(services.deleteFaturamento).toHaveBeenCalledWith(4, token);
    expect(services.deleteGlosa).toHaveBeenCalledWith(7, token);
    expect(services.deleteRecursoGlosa).toHaveBeenCalledWith(8, token);
  });

  it('loads receivables, calculates totals and delegates finance operations', async () => {
    vi.mocked(services.getContasReceber).mockResolvedValue([account] as never);
    vi.mocked(services.getPacientes).mockResolvedValue({
      items: [patient],
    } as never);
    vi.mocked(services.getFinanceiroResumo).mockResolvedValue(summary as never);

    const { result } = renderHook(() => useReceivables());

    let patients: unknown;
    await act(async () => {
      patients = await result.current.loadReceivables(token);
    });

    expect(patients).toEqual([patient]);
    expect(result.current.openBalance).toBe(80);
    expect(result.current.received).toBe(20);
    expect(result.current.financeiroResumo).toEqual(summary);

    await result.current.registerReceipt(5, { valor: 20, formaRecebimento: 'Pix' } as never, token);
    await result.current.reverseReceipt(10, 'Duplicado', token);
    await result.current.searchReceivables({ page: 2 } as never, token);
    await result.current.cancelReceivable(5, { motivo: 'Cancelamento' } as never, token);

    expect(services.registrarRecebimento).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ valor: 20 }),
      token,
    );
    expect(services.estornarRecebimento).toHaveBeenCalledWith(10, 'Duplicado', token);
    expect(services.searchContasReceber).toHaveBeenCalledWith({ page: 2 }, token);
    expect(services.cancelContaReceber).toHaveBeenCalledWith(5, { motivo: 'Cancelamento' }, token);
  });

  it('loads prices and selects create or update from the identifier', async () => {
    vi.mocked(services.getConvenioProcedimentoPrecos).mockResolvedValue([price] as never);

    const { result } = renderHook(() => useProcedurePrices());
    expect(result.current.price).toEqual(
      expect.objectContaining({
        percentualPrincipal: '100',
        percentualAuxiliar1: '0',
      }),
    );

    await act(() => result.current.loadProcedurePrices(token));
    expect(result.current.precos).toEqual([price]);

    const payload = { cbhpmCodigo: '10101012' } as never;
    await result.current.saveProcedurePrice(null, payload, token);
    await result.current.saveProcedurePrice(6, payload, token);
    await result.current.deactivateProcedurePrice(6, token);

    expect(services.saveConvenioProcedimentoPreco).toHaveBeenCalledWith(payload, token);
    expect(services.updateConvenioProcedimentoPreco).toHaveBeenCalledWith(6, payload, token);
    expect(services.deactivateConvenioProcedimentoPreco).toHaveBeenCalledWith(6, token);
  });

  it('creates fresh initial form values', () => {
    expect(createInitialAtendimentoForm('7').medicoResponsavelId).toBe('7');
    expect(createInitialFaturamentoForm()).not.toBe(createInitialFaturamentoForm());
    expect(createInitialPriceForm()).not.toBe(createInitialPriceForm());
  });
});
