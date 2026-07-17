import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, getJwtExpirationDelayMs, getJwtExpirationMs, isJwtExpired } from './jwt';

function createJwtToken(payload: Record<string, unknown>) {
  const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.signature`;
}

describe('jwt utils', () => {
  it('decodifica o payload de tokens JWT validos', () => {
    const token = createJwtToken({ clinicaSlug: 'hemodinks', exp: 100 });

    expect(decodeJwtPayload(token)).toEqual({ clinicaSlug: 'hemodinks', exp: 100 });
  });

  it('calcula expiracao e atraso restante pelo claim exp', () => {
    const token = createJwtToken({ exp: 2 });

    expect(getJwtExpirationMs(token)).toBe(2000);
    expect(isJwtExpired(token, 1000)).toBe(false);
    expect(isJwtExpired(token, 2000)).toBe(true);
    expect(getJwtExpirationDelayMs(token, 1000, 250)).toBe(750);
  });

  it('ignora tokens sem payload ou sem claim exp', () => {
    expect(decodeJwtPayload('jwt-token')).toBeNull();
    expect(getJwtExpirationMs('jwt-token')).toBeNull();
    expect(isJwtExpired('jwt-token')).toBe(false);
    expect(getJwtExpirationDelayMs(createJwtToken({ nome: 'George' }))).toBeNull();
  });
});
