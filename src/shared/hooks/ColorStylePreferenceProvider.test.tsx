import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { mockSession } from '../../test/appTestData';
import { SystemSettingsPage } from '../../features/settings/SystemSettingsPage';
import { CalculatorPreferenceProvider } from '../../features/calculator/CalculatorPreferenceProvider';
import { AppearanceMenu } from '../components/AppearanceMenu';
import { COLOR_STYLE_KEY, ColorStylePreferenceProvider } from './ColorStylePreferenceProvider';

vi.mock('../../features/settings/MfaSettingsPanel', () => ({ MfaSettingsPanel: () => null }));
vi.mock('../../features/settings/AuditSettingsPanel', () => ({ AuditSettingsPanel: () => null }));
const privacy = vi.hoisted(() => ({ preferences: true }));
vi.mock('../../features/privacy/ConsentProvider', () => ({
  useConsent: () => ({ consent: { preferences: privacy.preferences } }),
}));


function mount() {
  return render(<CalculatorPreferenceProvider session={mockSession()}><ColorStylePreferenceProvider>
    <SystemSettingsPage session={mockSession()} theme="dark" onThemeChange={() => {}} onPasswordChanged={() => {}} />
    <AppearanceMenu theme="dark" onToggle={() => {}} />
  </ColorStylePreferenceProvider></CalculatorPreferenceProvider>);
}

// O cartão das configurações vem antes do menu do topo no documento (o menu tem um grupo de mesmo nome).
const settingsGroup = () => screen.getAllByRole('group', { name: 'Cores do Hemodinks' })[0];
// Opções do cartão nas configurações (o menu do topo tem botões com os mesmos nomes).
const option = (name: string) => within(settingsGroup()).getByRole('button', { name });
const menuOption = (name: string) => within(screen.getByRole('group', { name: 'Visual do sistema' })).getByRole('button', { name });

beforeEach(() => { privacy.preferences = true; localStorage.clear(); document.documentElement.removeAttribute('data-color-style'); });
afterEach(() => { cleanup(); });

describe('Cores do Hemodinks', () => {
  it('começa em "Cores padrão", ao lado do Tema nas configurações, sem atributo neutro', () => {
    mount();
    expect(screen.getByRole('group', { name: 'Tema do sistema' })).toBeInTheDocument();
    expect(settingsGroup()).toBeInTheDocument();
    expect(option('Cores padrão')).toHaveAttribute('aria-pressed', 'true');
    expect(option('Cores neutras')).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).not.toHaveAttribute('data-color-style');
  });

  it('o cartão das configurações e o menu "Visual do sistema" alteram o mesmo estado', () => {
    mount();
    fireEvent.click(option('Cores neutras'));
    expect(document.documentElement).toHaveAttribute('data-color-style', 'neutral');
    expect(option('Cores neutras')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Visual do sistema' }));
    expect(menuOption('Cores neutras')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(menuOption('Cores padrão'));
    expect(document.documentElement).not.toHaveAttribute('data-color-style');
    expect(option('Cores padrão')).toHaveAttribute('aria-pressed', 'true');
    expect(menuOption('Cores neutras')).toHaveAttribute('aria-pressed', 'false');
  });

  it('grava e restaura a preferência quando há consentimento', () => {
    const first = mount();
    fireEvent.click(option('Cores neutras'));
    expect(localStorage.getItem(COLOR_STYLE_KEY)).toBe('neutral');
    first.unmount();
    expect(document.documentElement).not.toHaveAttribute('data-color-style');
    mount();
    expect(option('Cores neutras')).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-color-style', 'neutral');
  });

  it('sem consentimento de preferências, vale só na sessão e não grava nada', () => {
    privacy.preferences = false;
    localStorage.setItem(COLOR_STYLE_KEY, 'neutral');
    mount();
    expect(option('Cores padrão')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(option('Cores neutras'));
    expect(document.documentElement).toHaveAttribute('data-color-style', 'neutral');
    expect(localStorage.getItem(COLOR_STYLE_KEY)).toBeNull();
  });
});
