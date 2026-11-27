import { Palette, SwatchBook } from 'lucide-react';
import type { ColorStyle } from '../../appTypes';

type ColorStyleToggleProps = {
  colorStyle: ColorStyle;
  onToggle: () => void;
};

// Mesmo padrão do ThemeToggle: o botão mostra a opção para a qual vai trocar.
export function ColorStyleToggle({ colorStyle, onToggle }: ColorStyleToggleProps) {
  const isNeutral = colorStyle === 'neutral';
  const label = isNeutral ? 'Usar cores padrão' : 'Usar cores neutras';

  return (
    <button
      type="button"
      className="ghost-button theme-toggle color-style-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {isNeutral ? <Palette size={17} /> : <SwatchBook size={17} />}
      <span className="theme-label-wide">{isNeutral ? 'Cores padrão' : 'Cores neutras'}</span>
      <span className="theme-label-short">{isNeutral ? 'Padrão' : 'Neutras'}</span>
    </button>
  );
}
