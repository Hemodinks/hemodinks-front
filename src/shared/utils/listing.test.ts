import { describe, expect, it } from 'vitest';
import { getRecordActivityTime } from './listing';

describe('getRecordActivityTime', () => {
  it('prioriza a data de alteração quando ela é mais recente', () => {
    expect(
      getRecordActivityTime({
        id: 1,
        dataCadastro: '2026-07-01T10:00:00Z',
        dataAtualizacao: '2026-07-29T10:00:00Z',
      }),
    ).toBe(new Date('2026-07-29T10:00:00Z').getTime());
  });

  it('usa a data de criação quando não houve alteração', () => {
    expect(
      getRecordActivityTime({
        id: 2,
        dataCadastro: '2026-07-20T10:00:00Z',
      }),
    ).toBe(new Date('2026-07-20T10:00:00Z').getTime());
  });

  it('usa o identificador como fallback para respostas legadas', () => {
    expect(getRecordActivityTime({ id: 37 })).toBe(37);
  });
});
