export function decodeJwtPayload(token: string) {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const base64 = segments[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');

    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getJwtExpirationMs(token?: string) {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  const expSeconds = typeof exp === 'number'
    ? exp
    : typeof exp === 'string'
      ? Number(exp)
      : null;

  if (expSeconds === null || !Number.isFinite(expSeconds) || expSeconds <= 0) {
    return null;
  }

  return expSeconds * 1000;
}

export function isJwtExpired(token?: string, nowMs = Date.now(), leewayMs = 0) {
  const expirationMs = getJwtExpirationMs(token);
  return expirationMs !== null && expirationMs <= nowMs + leewayMs;
}

export function getJwtExpirationDelayMs(token?: string, nowMs = Date.now(), leewayMs = 0) {
  const expirationMs = getJwtExpirationMs(token);
  return expirationMs === null
    ? null
    : Math.max(0, expirationMs - nowMs - leewayMs);
}
