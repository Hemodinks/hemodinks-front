import { describe, expect, it } from 'vitest';
import type { CbhpmGeral } from '../../types';
import {
  filterCbhpmCachedItems,
  isCbhpmCacheSearchReady,
  normalizeCbhpmSearchText,
} from './cbhpmLookupUtils';

const procedimentos: CbhpmGeral[] = [
  {
    id: 1,
    codigo: '10101012',
    procedimento: 'Em consultorio',
    porte: '2B',
    valorReferencia: 120,
  },
  {
    id: 2,
    codigo: '20101201',
    procedimento: 'Avaliacao clinica e eletronica',
    porte: '2B',
    valorReferencia: 125.5,
  },
  {
    id: 3,
    codigo: '30909090',
    procedimento: 'Hemodiálise aguda',
    porte: '3A',
    valorReferencia: 320,
  },
];

describe('cbhpmLookupUtils', () => {
  it('normaliza texto de busca removendo acentos e caixa', () => {
    expect(normalizeCbhpmSearchText('  Hemodiálise  ')).toBe('hemodialise');
  });

  it('aguarda 5 caracteres em codigo ou descricao antes de filtrar no cache', () => {
    expect(isCbhpmCacheSearchReady({ codigo: '', procedimento: '', porte: '' })).toBe(true);
    expect(isCbhpmCacheSearchReady({ codigo: '1010', procedimento: '', porte: '' })).toBe(false);
    expect(isCbhpmCacheSearchReady({ codigo: '10101', procedimento: '', porte: '' })).toBe(true);
    expect(isCbhpmCacheSearchReady({ codigo: '', procedimento: 'hemo', porte: '' })).toBe(false);
    expect(isCbhpmCacheSearchReady({ codigo: '', procedimento: 'hemod', porte: '' })).toBe(true);
  });

  it('filtra procedimentos no cache por codigo limpo ou descricao a partir de 5 caracteres', () => {
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '1010', procedimento: '', porte: '' })).toEqual([]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '10101', procedimento: '', porte: '' }).map((item) => item.id)).toEqual([1]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '', procedimento: 'hemod', porte: '' }).map((item) => item.id)).toEqual([3]);
  });

  it('mantem o filtro por porte sobre os resultados do cache', () => {
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '', procedimento: '', porte: '2B' }).map((item) => item.id)).toEqual([1, 2]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '', procedimento: 'avaliacao', porte: '3A' })).toEqual([]);
  });
});
