import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearApplicationAnalyticsCookies,
  clearOptionalPreferenceStorage,
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  hasPreferenceConsent,
  readConsent,
  saveConsent,
} from '../../shared/privacy/consentStorage';

describe('consentStorage', () => {
  beforeEach(() => localStorage.clear());

  it('persiste versão, categorias e data da escolha sem dados pessoais', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T12:00:00.000Z'));

    saveConsent({ preferences: true, analytics: false });

    expect(readConsent()).toEqual({
      necessary: true,
      version: CONSENT_POLICY_VERSION,
      updatedAt: '2026-09-02T12:00:00.000Z',
      preferences: true,
      analytics: false,
    });
    expect(hasPreferenceConsent()).toBe(true);
    vi.useRealTimers();
  });

  it('ignora registros inválidos ou de outra versão', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      necessary: true,
      version: '0.9',
      updatedAt: '2026-09-02T12:00:00.000Z',
      preferences: true,
      analytics: true,
    }));
    expect(readConsent()).toBeNull();
  });

  it('não aceita um registro que desative os recursos necessários', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      necessary: false,
      version: CONSENT_POLICY_VERSION,
      updatedAt: '2026-09-02T12:00:00.000Z',
      preferences: true,
      analytics: true,
    }));
    expect(readConsent()).toBeNull();
  });

  it('remove apenas preferências opcionais e preserva sessão e consentimento', () => {
    saveConsent({ preferences: false, analytics: false });
    localStorage.setItem('hemodinks.theme', 'light');
    localStorage.setItem('hemodinks.dashboard.module-order', '[]');
    sessionStorage.setItem('hemodinks.session', 'jwt');

    clearOptionalPreferenceStorage();

    expect(localStorage.getItem('hemodinks.theme')).toBeNull();
    expect(localStorage.getItem('hemodinks.dashboard.module-order')).toBeNull();
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).not.toBeNull();
    expect(sessionStorage.getItem('hemodinks.session')).toBe('jwt');
  });

  it('expira cookies de análise pertencentes à aplicação sem tocar em outros nomes', () => {
    document.cookie = 'NREUM=value; Path=/';
    document.cookie = 'essential=value; Path=/';
    clearApplicationAnalyticsCookies();
    expect(document.cookie).not.toContain('NREUM=');
    expect(document.cookie).toContain('essential=value');
  });
});
