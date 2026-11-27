import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ColorStyle } from '../../appTypes';
import { useConsent } from '../../features/privacy/ConsentProvider';

// Preferência de "Estilo de cores", como o tema: vale para este navegador e só é gravada com consentimento.
export const COLOR_STYLE_KEY = 'hemodinks.colorStyle';

type ColorStylePreference = {
  colorStyle: ColorStyle;
  setColorStyle: (colorStyle: ColorStyle) => void;
  toggleColorStyle: () => void;
};

const ColorStyleContext = createContext<ColorStylePreference | null>(null);

function readStoredColorStyle(): ColorStyle {
  try {
    return localStorage.getItem(COLOR_STYLE_KEY) === 'neutral' ? 'neutral' : 'default';
  } catch {
    return 'default';
  }
}

export function applyColorStyle(colorStyle: ColorStyle) {
  if (colorStyle === 'neutral') document.documentElement.dataset.colorStyle = 'neutral';
  else document.documentElement.removeAttribute('data-color-style');
}

export function ColorStylePreferenceProvider({ children }: { children: ReactNode }) {
  const { consent } = useConsent();
  const canPersist = consent?.preferences === true;
  const [colorStyle, setColorStyle] = useState<ColorStyle>(() => canPersist ? readStoredColorStyle() : 'default');

  useEffect(() => {
    applyColorStyle(colorStyle);
    try {
      if (!canPersist) localStorage.removeItem(COLOR_STYLE_KEY);
      else if (colorStyle === 'neutral') localStorage.setItem(COLOR_STYLE_KEY, colorStyle);
      else localStorage.removeItem(COLOR_STYLE_KEY);
    } catch {
      // Armazenamento indisponível: a preferência continua valendo nesta sessão.
    }
  }, [canPersist, colorStyle]);

  // Ao sair da área autenticada, o atributo não deve continuar na página.
  useEffect(() => () => applyColorStyle('default'), []);

  const toggleColorStyle = useCallback(() => setColorStyle((current) => current === 'neutral' ? 'default' : 'neutral'), []);
  const value = useMemo(() => ({ colorStyle, setColorStyle, toggleColorStyle }), [colorStyle, toggleColorStyle]);
  return <ColorStyleContext.Provider value={value}>{children}</ColorStyleContext.Provider>;
}

export function useColorStylePreference() {
  const preference = useContext(ColorStyleContext);
  if (!preference) throw new Error('useColorStylePreference must be used within ColorStylePreferenceProvider');
  return preference;
}

// Para componentes que também aparecem fora da área autenticada (sem provider).
export function useOptionalColorStylePreference() {
  return useContext(ColorStyleContext);
}
