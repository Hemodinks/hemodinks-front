import { describe, expect, it } from 'vitest';
import {
  areCbhpmFiltersSearchable,
  buildCbhpmQueryFilters,
  getCbhpmFilterValidationMessage,
  normalizeCbhpmSearchText,
} from './cbhpmLookupUtils';

describe('cbhpmLookupUtils', () => {
  it('normaliza texto de busca removendo acentos e caixa', () => {
    expect(normalizeCbhpmSearchText('  Hemodiálise  ')).toBe('hemodialise');
  });

  it('mantem filtros vazios pesquisaveis para listar todos os procedimentos', () => {
    const filters = { codigo: '', procedimento: '', porte: '' };

    expect(areCbhpmFiltersSearchable(filters)).toBe(true);
    expect(getCbhpmFilterValidationMessage(filters)).toBe('');
    expect(buildCbhpmQueryFilters(filters)).toEqual({});
  });

  it('exige ao menos 3 caracteres em codigo e descricao quando preenchidos', () => {
    expect(areCbhpmFiltersSearchable({ codigo: '10', procedimento: '', porte: '' })).toBe(false);
    expect(areCbhpmFiltersSearchable({ codigo: '', procedimento: 'tu', porte: '' })).toBe(false);
    expect(getCbhpmFilterValidationMessage({ codigo: '10', procedimento: 'tu', porte: '' }))
      .toBe('Informe pelo menos 3 digitos no codigo e 3 caracteres na descricao para consultar.');
  });

  it('monta parametros somente com filtros validos para a API', () => {
    expect(buildCbhpmQueryFilters({ codigo: '101', procedimento: '', porte: '' })).toEqual({ codigo: '101' });
    expect(buildCbhpmQueryFilters({ codigo: '', procedimento: ' tumor ', porte: '' })).toEqual({ procedimento: 'tumor' });
    expect(buildCbhpmQueryFilters({ codigo: '4070101', procedimento: 'tumor', porte: '2b' })).toEqual({
      codigo: '4070101',
      procedimento: 'tumor',
      porte: '2B',
    });
  });
});
