import { expect, it } from 'vitest';
import { privateErrorSummary } from './telemetryPrivacy';

it('resume erros sem expor nome ou mensagem arbitrários', () => {
  expect(privateErrorSummary(Object.assign(new Error('SECRET'), { name: 'SECRET' }))).toBe('UnknownError');
  expect(privateErrorSummary(new TypeError('SECRET'))).toBe('TypeError');
  expect(privateErrorSummary('SECRET')).toBe('UnknownError');
});
