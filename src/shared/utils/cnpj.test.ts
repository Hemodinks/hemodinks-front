import { describe, expect, it } from 'vitest';
import { formatCnpjInput, getCnpjValidationMessage, isValidCnpj, normalizeCnpj } from './cnpj';

describe('CNPJ', () => {
  it('normaliza e aplica a máscara durante a digitação', () => {
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
    expect(formatCnpjInput('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatCnpjInput('11222')).toBe('11.222');
  });

  it.each(['11.222.333/0001-81', '11222333000181', '04.252.011/0001-10'])('aceita CNPJ válido: %s', (value) => {
    expect(isValidCnpj(value)).toBe(true);
    expect(getCnpjValidationMessage(value)).toBe('');
  });

  it.each(['', '11.111.111/1111-11', '11.222.333/0001-82', '1122233300018'])('rejeita CNPJ ausente ou inválido: %s', (value) => {
    expect(isValidCnpj(value)).toBe(false);
    expect(getCnpjValidationMessage(value)).not.toBe('');
  });
});
