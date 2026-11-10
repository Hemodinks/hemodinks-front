import { describe, expect, it } from 'vitest';
import { buildListQueryParams } from '../../services/queryParams';
import { getConsolidationMaxYear, getConsolidationYearError } from './consolidationDate';

const NOW = new Date('2026-11-10T12:00:00Z');
const RANGE_ERROR = 'O ano da data da consolidação deve estar entre 2026 e 2027.';

describe('consolidationDate', () => {
  it.each([
    ['2027-01-01T02:00:00Z', 2027],
    ['2027-01-01T03:00:00Z', 2028],
    ['2026-06-15T12:00:00Z', 2027],
  ])('usa o ano civil de Brasília + 1 em %s', (now, expected) => {
    expect(getConsolidationMaxYear(new Date(now))).toBe(expected);
  });

  it.each([
    ['31/12/2025', RANGE_ERROR],
    ['01/01/2026', ''],
    ['31/12/2027', ''],
    ['01/01/2028', RANGE_ERROR],
    ['20/05/8202', RANGE_ERROR],
    ['', ''],
    ['31/02/2026', ''],
  ])('valida o ano da consolidação %s', (value, expected) => {
    expect(getConsolidationYearError(value, undefined, NOW)).toBe(expected);
  });

  it('tolera data legada fora da faixa enquanto não for alterada', () => {
    expect(getConsolidationYearError('02/04/2016', '02/04/2016', NOW)).toBe('');
    expect(getConsolidationYearError('02/04/2045', '02/04/2016', NOW)).toBe(RANGE_ERROR);
    expect(getConsolidationYearError('02/04/2026', '02/04/2016', NOW)).toBe('');
  });

  it('envia o filtro de pendência somente quando ativo', () => {
    expect(buildListQueryParams({ page: 1, pendenciaDataConsolidacao: true })?.get('pendenciaDataConsolidacao')).toBe('true');
    expect(buildListQueryParams({ page: 1, pendenciaDataConsolidacao: false })?.has('pendenciaDataConsolidacao')).toBe(false);
  });
});
