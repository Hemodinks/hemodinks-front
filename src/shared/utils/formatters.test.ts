import { describe, expect, it } from 'vitest';
import { formatProfileName, normalizeDisplayText } from './formatters';

describe('normalizeDisplayText', () => {
  it('corrige nomes de convenios recebidos com encoding quebrado', () => {
    expect(normalizeDisplayText('Bradesco Sa\u00c3\u00bade')).toBe('Bradesco Saúde');
    expect(normalizeDisplayText('Cemig Sa\uFFFDde')).toBe('Cemig Saúde');
    expect(normalizeDisplayText('Sul Am\u00c3\u00a9rica')).toBe('Sul América');
    expect(normalizeDisplayText('Unimed Uberl\uFFFDndia - Plano  Unimed Interc\uFFFDmbio'))
      .toBe('Unimed Uberlândia - Plano  Unimed Intercâmbio');
  });
});

describe('formatProfileName', () => {
  it('prioriza o perfil catalogado pelo id para evitar mojibake vindo da API', () => {
    expect(formatProfileName(2, 'M\uFFFDdicos')).toBe('Médicos');
    expect(formatProfileName(2, 'Medicos')).toBe('Médicos');
  });

  it('corrige variantes quebradas do nome do perfil medico quando o id nao vem na API', () => {
    expect(formatProfileName(null, 'M\uFFFDdicos')).toBe('Médicos');
    expect(formatProfileName(null, 'M\u00C3\u00A9dicos')).toBe('Médicos');
  });
});
