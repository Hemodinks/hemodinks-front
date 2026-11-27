import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Moon, Palette, Sun, SwatchBook } from 'lucide-react';
import type { Theme } from '../../appTypes';
import { useOptionalColorStylePreference } from '../hooks/ColorStylePreferenceProvider';

type AppearanceMenuProps = {
  theme: Theme;
  onToggle: () => void;
  floating?: boolean;
};

// "Visual do sistema": tema claro/escuro e Cores do Hemodinks num só menu, no topo e nas telas de acesso.
// Mesmo comportamento do menu do usuário: Escape e clique fora fecham; o acionador é um <button> com aria-expanded.
export function AppearanceMenu({ theme, onToggle, floating = false }: AppearanceMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const colorStyle = useOptionalColorStylePreference();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const chooseTheme = (next: Theme) => { if (next !== theme) onToggle(); };

  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
  return <div className={`appearance-menu ${floating ? 'floating' : ''}`} ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button type="button" ref={trigger} className="appearance-menu-trigger" aria-expanded={open} aria-controls={id}
      title="Visual do sistema" onClick={() => setOpen(!open)}>
      <Palette size={17} aria-hidden="true" />
      <span className="appearance-menu-title">Visual do sistema</span>
      <ChevronDown size={16} aria-hidden="true" className={`appearance-menu-chevron ${open ? 'is-open' : ''}`} />
    </button>
    {open && <div id={id} className="appearance-menu-panel" role="group" aria-label="Visual do sistema">
      <span className="appearance-menu-heading">Tema</span>
      <div className="appearance-menu-options" role="group" aria-label="Tema">
        <button type="button" aria-pressed={theme === 'light'} onClick={() => chooseTheme('light')}><Sun size={18} aria-hidden="true" />Claro</button>
        <button type="button" aria-pressed={theme === 'dark'} onClick={() => chooseTheme('dark')}><Moon size={18} aria-hidden="true" />Escuro</button>
      </div>
      {colorStyle && <>
        <span className="appearance-menu-heading">Cores do Hemodinks</span>
        <div className="appearance-menu-options" role="group" aria-label="Cores do Hemodinks">
          <button type="button" aria-pressed={colorStyle.colorStyle === 'default'} onClick={() => colorStyle.setColorStyle('default')}><Palette size={18} aria-hidden="true" />Cores padrão</button>
          <button type="button" aria-pressed={colorStyle.colorStyle === 'neutral'} onClick={() => colorStyle.setColorStyle('neutral')}><SwatchBook size={18} aria-hidden="true" />Cores neutras</button>
        </div>
      </>}
    </div>}
  </div>;
}
