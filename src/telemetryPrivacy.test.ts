import { expect, it } from 'vitest';
import { privateErrorSummary, sanitizeTelemetryText, sanitizedErrorForTelemetry } from './telemetryPrivacy';

// Montado em runtime, como nos demais testes, para não parecer segredo a scanners.
const JWT = [{ alg: 'HS256' }, { sub: '123' }].map(part => btoa(JSON.stringify(part)).replace(/=+$/, '')).join('.') + '.c2ln';
const SENSITIVE = `cpf 123.456.789-09 ou 12345678909, email maria.silva+x@clinica.com.br, ${JWT}, `
  + 'Bearer abc.def-ghi, id 3f2504e0-4f89-11d3-9a0c-0305e82c3301, https://api.hemodinks.com/pacientes?nome=Maria';

it('resume erros sem expor nome ou mensagem arbitrários', () => {
  expect(privateErrorSummary(Object.assign(new Error('SECRET'), { name: 'SECRET' }))).toBe('UnknownError');
  expect(privateErrorSummary(new TypeError('SECRET'))).toBe('TypeError');
  expect(privateErrorSummary('SECRET')).toBe('UnknownError');
});

it('remove CPF, e-mail, token, GUID e URL do texto de telemetria', () => {
  const sanitized = sanitizeTelemetryText(SENSITIVE);

  for (const secret of ['123.456.789-09', '12345678909', 'maria.silva', 'clinica.com.br', JWT, 'abc.def-ghi',
    '3f2504e0', 'api.hemodinks.com', 'Maria']) {
    expect(sanitized).not.toContain(secret);
  }
  expect(sanitized).toBe('cpf [cpf] ou [cpf], email [email], [token], Bearer [token], id [id], [url]');
});

it('erro enviado não leva mensagem livre e só leva frames sanitizados', () => {
  const error = new TypeError(`Paciente Maria ${SENSITIVE}`);
  error.stack = `TypeError: ${error.message}\n`
    + '    at render (https://app.hemodinks.com/assets/index-abc.js?token=xyz#frag:1:2345)\n'
    + `    at save (https://app.hemodinks.com/assets/form-${JWT}.js:3:10)\n`
    + '    not a frame maria@x.com';

  const sanitized = sanitizedErrorForTelemetry(error);

  expect(sanitized.name).toBe('TypeError');
  expect(sanitized.message).toBe('TypeError');
  expect(sanitized.stack).toBe('TypeError\nat render (/assets/index-abc.js:1:2345)\nat save (/assets/form-[token].js:3:10)');
  for (const secret of ['Maria', 'maria', '123.456.789-09', JWT, 'xyz', 'hemodinks.com']) {
    expect(`${sanitized.message}\n${sanitized.stack}`).not.toContain(secret);
  }
});

it('linha de mensagem que imita frame e URL data:/blob: não saem', () => {
  const error = new Error('x');
  error.name = 'Error';
  error.stack = 'Error: outro texto\n'
    + '    at Paciente Maria Souza nasceu em 01/02/1990\n'
    + '    maria@clinica\n'
    + '    at run (data:text/javascript,cpf=12345678909:1:5)\n'
    + '    at go (blob:https://app.hemodinks.com/9f1c:2:7)';

  expect(sanitizedErrorForTelemetry(error).stack).toBe('Error\nat run ([url]:1:5)\nat go ([url]:2:7)');
});

it('regra de e-mail não degrada em texto longo sem @', () => {
  const started = performance.now();
  sanitizeTelemetryText('a'.repeat(50_000));
  expect(performance.now() - started).toBeLessThan(500);
});

it('erro de API ou valor não-Error vira resumo sem texto da resposta', () => {
  const apiError = Object.assign(new Error('CPF 123.456.789-09 já cadastrado para João'), { name: 'ApiError' });

  expect(sanitizedErrorForTelemetry(apiError).message).toBe('ApiError');
  expect(sanitizedErrorForTelemetry(apiError).stack).not.toContain('João');
  expect(sanitizedErrorForTelemetry({ token: JWT }).stack).toBe('UnknownError');
});
