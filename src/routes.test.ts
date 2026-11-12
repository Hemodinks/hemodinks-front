import { describe, expect, it } from 'vitest';
import { getFormPath, getViewFromPath, parseModuleRoute, VIEW_PATHS } from './routes';

describe('parseModuleRoute', () => {
  it.each([
    ['/pacientes', { view: 'patients', mode: 'list', recordId: null }],
    ['/pacientes/', { view: 'patients', mode: 'list', recordId: null }],
    ['/pacientes/novo', { view: 'patients', mode: 'form', recordId: null }],
    ['/pacientes/42', { view: 'patients', mode: 'form', recordId: 42 }],
    ['/pacientes/42/', { view: 'patients', mode: 'form', recordId: 42 }],
    ['/usuarios/novo', { view: 'users', mode: 'form', recordId: null }],
    ['/usuarios/7', { view: 'users', mode: 'form', recordId: 7 }],
    ['/grupos-medicos/novo', { view: 'medicalGroups', mode: 'form', recordId: null }],
    ['/grupos-medicos/3', { view: 'medicalGroups', mode: 'form', recordId: 3 }],
    ['/meu-cadastro', { view: 'profile', mode: 'form', recordId: null }],
    ['/configuracoes', { view: 'settings', mode: 'list', recordId: null }],
    ['/', { view: 'dashboard', mode: 'list', recordId: null }],
  ])('%s', (path, expected) => {
    expect(parseModuleRoute(path)).toEqual(expected);
  });

  it.each([
    '/pacientes/abc', '/pacientes/0', '/pacientes/-1', '/pacientes/01', '/pacientes/1.5', '/pacientes/42/extra',
    '/pacientes/12345678901', '/pacientes/novo/1', '/agenda/novo', '/faturamento-medico/1', '/meu-cadastro/1',
    '/opcoes/novo', '/qualquer-coisa',
  ])('%s é rota desconhecida', (path) => {
    expect(parseModuleRoute(path)).toEqual({ view: null, mode: 'list', recordId: null });
  });

  it('mantém getViewFromPath para todas as rotas de módulo', () => {
    for (const [view, path] of Object.entries(VIEW_PATHS)) expect(getViewFromPath(path)).toBe(view);
  });
});

describe('getFormPath', () => {
  it('gera as rotas de cadastro e edição', () => {
    expect(getFormPath('patients', null)).toBe('/pacientes/novo');
    expect(getFormPath('users', 7)).toBe('/usuarios/7');
    expect(getFormPath('medicalGroups', 3)).toBe('/grupos-medicos/3');
  });

  it('é a inversa de parseModuleRoute', () => {
    for (const view of ['patients', 'users', 'medicalGroups'] as const) {
      for (const recordId of [null, 1, 99]) {
        expect(parseModuleRoute(getFormPath(view, recordId))).toEqual({ view, mode: 'form', recordId });
      }
    }
  });
});
