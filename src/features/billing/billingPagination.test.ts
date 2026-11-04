import { beforeEach, expect, it, vi } from 'vitest';
import { getFaturamentosMedicos } from '../../services';
import { basePaciente, paged } from '../../test/appTestData';
import { loadBillingPatients } from './billingPageUtils';

vi.mock('../../services', () => ({ getFaturamentosMedicos: vi.fn() }));
const filters = { search: '', medico: '', convenio: '', procedimento: '', competenciaInicio: '', competenciaFinal: '' };
beforeEach(() => vi.resetAllMocks());

it('preserva a ordem de todas as páginas da consulta válida', async () => {
  vi.mocked(getFaturamentosMedicos)
    .mockResolvedValueOnce(paged([{ ...basePaciente, id: 2 }], 1, 1, 2))
    .mockResolvedValueOnce(paged([{ ...basePaciente, id: 1 }], 2, 1, 2));
  expect((await loadBillingPatients('a', filters)).map(item => item.id)).toEqual([2, 1]);
});

it.each(['duplicate', 'total', 'missing'] as const)('não publica coleta paginada inconsistente: %s', async change => {
  vi.mocked(getFaturamentosMedicos)
    .mockResolvedValueOnce(paged([{ ...basePaciente, id: 2 }], 1, 1, 2))
    .mockResolvedValueOnce(paged(change === 'missing' ? [] : [{ ...basePaciente, id: change === 'duplicate' ? 2 : 1 }], 2, 1, change === 'total' ? 3 : 2));
  await expect(loadBillingPatients('a', filters)).rejects.toThrow(/consulta.*atualiz|dados.*mudaram/i);
});
