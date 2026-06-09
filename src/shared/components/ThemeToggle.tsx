import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../../appTypes';

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
  floating?: boolean;
};

export function ThemeToggle({ theme, onToggle, floating = false }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`ghost-button theme-toggle ${floating ? 'floating' : ''}`}
      onClick={onToggle}
      title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span className="theme-label-wide">{isDark ? 'Tema claro' : 'Tema escuro'}</span>
      <span className="theme-label-short">{isDark ? 'Claro' : 'Escuro'}</span>
    </button>
  );
}
