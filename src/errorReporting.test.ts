import { afterEach, expect, it, vi } from 'vitest';
import { reportError, setErrorReporter } from './errorReporting';

afterEach(() => setErrorReporter(null));

it('não envia nada sem reporter, ou seja, sem consentimento de análise', () => {
  const reporter = vi.fn();
  reportError(new Error('x'), 'window-error');
  setErrorReporter(reporter);
  setErrorReporter(null);
  reportError(new Error('y'), 'window-error');

  expect(reporter).not.toHaveBeenCalled();
});

it('envia o erro sanitizado com a origem, uma vez por erro', () => {
  const reporter = vi.fn();
  setErrorReporter(reporter);
  const error = new TypeError('email maria@clinica.com');

  reportError(error, 'error-boundary');
  reportError(error, 'react-uncaught');

  expect(reporter).toHaveBeenCalledOnce();
  const [sent, attributes] = reporter.mock.calls[0];
  expect(sent).not.toBe(error);
  expect(sent.message).toBe('TypeError');
  expect(`${sent.stack}`).not.toContain('maria');
  expect(attributes).toEqual({ source: 'error-boundary' });
});

it('falha do reporter não derruba a aplicação', () => {
  setErrorReporter(() => { throw new Error('agent down'); });

  expect(() => reportError(new Error('x'), 'unhandled-rejection')).not.toThrow();
});
