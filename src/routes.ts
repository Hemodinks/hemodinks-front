import type { AppView } from './appTypes';

export const VIEW_PATHS: Record<AppView, string> = {
  dashboard: '/dashboard',
  users: '/usuarios',
  patients: '/pacientes',
  agenda: '/agenda',
};

export function getViewFromPath(pathname: string): AppView | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPath === '/') {
    return 'dashboard';
  }

  const match = Object.entries(VIEW_PATHS)
    .find(([, path]) => path === normalizedPath);

  return match ? match[0] as AppView : null;
}

export function isRootPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '';
}
