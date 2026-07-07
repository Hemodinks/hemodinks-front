import { describe, expect, it } from 'vitest';
import { formatProfileName } from './formatters';

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
