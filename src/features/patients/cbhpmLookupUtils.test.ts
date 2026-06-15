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

  it('aguarda 7 caracteres em codigo ou descricao antes de filtrar no cache', () => {
    expect(isCbhpmCacheSearchReady({ codigo: '', procedimento: '', porte: '' })).toBe(false);
    expect(isCbhpmCacheSearchReady({ codigo: '101010', procedimento: '', porte: '' })).toBe(false);
    expect(isCbhpmCacheSearchReady({ codigo: '1010101', procedimento: '', porte: '' })).toBe(true);
    expect(isCbhpmCacheSearchReady({ codigo: '', procedimento: 'hemodi', porte: '' })).toBe(false);
    expect(isCbhpmCacheSearchReady({ codigo: '', procedimento: 'hemodia', porte: '' })).toBe(true);
    expect(isCbhpmCacheSearchReady({ codigo: '101', procedimento: 'consulta', porte: '' })).toBe(true);
  });

  it('filtra procedimentos no cache por codigo limpo ou descricao a partir de 7 caracteres', () => {
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '101010', procedimento: '', porte: '' })).toEqual([]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '1010101', procedimento: '', porte: '' }).map((item) => item.id)).toEqual([1]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '', procedimento: 'hemodia', porte: '' }).map((item) => item.id)).toEqual([3]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '101', procedimento: 'avaliacao', porte: '' }).map((item) => item.id)).toEqual([2]);
  });

  it('mantem o filtro por porte sobre os resultados do cache', () => {
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '1010101', procedimento: '', porte: '2B' }).map((item) => item.id)).toEqual([1]);
    expect(filterCbhpmCachedItems(procedimentos, { codigo: '', procedimento: 'avaliacao', porte: '3A' })).toEqual([]);
  });
});
