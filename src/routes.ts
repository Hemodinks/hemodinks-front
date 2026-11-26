import type { AppView, ModuleMode } from './appTypes';

export const VIEW_PATHS: Record<AppView, string> = {
  dashboard: '/dashboard',
  users: '/usuarios',
  profile: '/meu-cadastro',
  patients: '/pacientes',
  billing: '/faturamento-medico',
  billingHistory: '/historico-faturamento',
  reports: '/relatorios',
  tutorials: '/tutoriais-interativos',
  medicalGroups: '/grupos-medicos',
  agenda: '/agenda',
  settings: '/opcoes',
  clinics: '/clinicas',
};

// Modules whose create/edit form has its own URL: <base>/novo and <base>/<id>.
export const FORM_VIEWS = ['patients', 'users', 'medicalGroups'] as const;
export type FormView = typeof FORM_VIEWS[number];
export const NEW_RECORD_SEGMENT = 'novo';

export type ModuleRoute = {
  view: AppView | null;
  mode: ModuleMode;
  // null on the list and on <base>/novo; the record being edited on <base>/<id>.
  recordId: number | null;
};

const normalize = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
const isFormView = (view: AppView): view is FormView => (FORM_VIEWS as readonly string[]).includes(view);

export function getFormPath(view: FormView, recordId: number | null) {
  return `${VIEW_PATHS[view]}/${recordId ?? NEW_RECORD_SEGMENT}`;
}

export function parseModuleRoute(pathname: string): ModuleRoute {
  const normalizedPath = normalize(pathname);

  if (normalizedPath === '/configuracoes') return { view: 'settings', mode: 'list', recordId: null };
  if (normalizedPath === '/') return { view: 'dashboard', mode: 'list', recordId: null };

  for (const [view, path] of Object.entries(VIEW_PATHS) as Array<[AppView, string]>) {
    // "Meu cadastro" is always the user's own form.
    if (normalizedPath === path) return { view, mode: view === 'profile' ? 'form' : 'list', recordId: null };
    if (!isFormView(view) || !normalizedPath.startsWith(`${path}/`)) continue;
    const segment = normalizedPath.slice(path.length + 1);
    if (segment === NEW_RECORD_SEGMENT) return { view, mode: 'form', recordId: null };
    // Only positive integer ids; anything else is an unknown route and falls back like any other.
    if (/^[1-9]\d{0,9}$/.test(segment)) {
      return { view, mode: 'form', recordId: Number(segment) };
    }
    return { view: null, mode: 'list', recordId: null };
  }

  return { view: null, mode: 'list', recordId: null };
}

export function getViewFromPath(pathname: string): AppView | null {
  return parseModuleRoute(pathname).view;
}

export function isRootPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '';
}
