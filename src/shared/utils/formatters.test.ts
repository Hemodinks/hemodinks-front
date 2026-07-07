import { describe, expect, it } from 'vitest';
import { formatProfileName } from './formatters';

describe('formatProfileName', () => {
  it('prioriza o perfil catalogado pelo id para evitar mojibake vindo da API', () => {
    expect(formatProfileName(2, 'M�dicos')).toBe('Médicos');
    expect(formatProfileName(2, 'Medicos')).toBe('Médicos');
  });
});
