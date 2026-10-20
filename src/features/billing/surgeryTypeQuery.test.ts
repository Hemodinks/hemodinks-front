import { describe, expect, it, vi } from 'vitest';
import { getFaturamentosMedicos } from '../../services';
import { basePaciente } from '../../test/appTestData';
import { loadBillingPatients } from './billingPageUtils';

vi.mock('../../services', () => ({ getFaturamentosMedicos: vi.fn() }));

describe('contrato de tipo de cirurgia na consulta paginada de faturamento', () => {
  it('transmite Urgencia em todas as páginas sem alterar os demais filtros', async () => {
    vi.mocked(getFaturamentosMedicos)
      .mockResolvedValueOnce({ items: [{ ...basePaciente, id: 1, tipoCirurgia: 'Urgencia' }], totalPages: 2 } as never)
      .mockResolvedValueOnce({ items: [{ ...basePaciente, id: 2, tipoCirurgia: 'Urgencia' }], totalPages: 2 } as never);
    const result = await loadBillingPatients('session-test', {
      tipoCirurgia: 'Urgencia', search: 'busca', medico: 'Médico', convenio: 'Convênio', procedimento: 'Procedimento', competenciaInicio: '2026-01', competenciaFinal: '2026-12',
    });
    expect(result.map((patient) => patient.id)).toEqual([1, 2]);
    expect(getFaturamentosMedicos).toHaveBeenCalledTimes(2);
    for (const [index, call] of vi.mocked(getFaturamentosMedicos).mock.calls.entries()) {
      expect(call).toEqual(['session-test', expect.objectContaining({
        page: index + 1, tipoCirurgia: 'Urgencia', search: 'busca', medico: 'Médico', convenio: 'Convênio', procedimento: 'Procedimento', competenciaInicio: '01/2026', competenciaFinal: '12/2026',
      })]);
    }
  });
});
