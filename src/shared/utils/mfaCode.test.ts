import { describe, expect, it } from 'vitest';
import { formatMfaCode, isCompleteMfaCode } from './mfaCode';

describe('campo do segundo fator (#150)', () => {
  it.each([
    ['33333333333', '333333'],
    ['12 34 56', '123456'],
    ['123', '123'],
    ['abcde', 'ABCDE'],
    ['abcdefghij', 'ABCDE-FGHIJ'],
    ['ABCDE-FGHIJ-KLM', 'ABCDE-FGHIJ'],
    ['a1b2c3d4e5f6', 'A1B2C-3D4E5'],
    ['', ''],
  ])('%s -> %s', (input, expected) => expect(formatMfaCode(input)).toBe(expected));

  it('só libera código completo', () => {
    expect(isCompleteMfaCode('123456')).toBe(true);
    expect(isCompleteMfaCode('ABCDE-FGHIJ')).toBe(true);
    expect(isCompleteMfaCode('12345')).toBe(false);
    expect(isCompleteMfaCode('ABCDE-FGHI')).toBe(false);
  });
});
