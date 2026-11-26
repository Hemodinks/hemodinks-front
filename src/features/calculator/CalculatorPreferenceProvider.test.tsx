import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mockSession } from '../../test/appTestData';
import { SystemSettingsPage } from '../settings/SystemSettingsPage';
import { CalculatorPreferenceProvider, useCalculatorPreference } from './CalculatorPreferenceProvider';

const privacy = vi.hoisted(() => ({ preferences: true }));
vi.mock('../privacy/ConsentProvider', () => ({
  useConsent: () => ({ consent: { preferences: privacy.preferences } }),
}));

const STORAGE_KEY = 'hemodinks.calculator.visibility';

function PreferenceControls() {
  const { visible, setVisible } = useCalculatorPreference();
  return <label>Visibilidade<input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} /></label>;
}

function mountPreference(session = mockSession()) {
  return render(<CalculatorPreferenceProvider session={session}><PreferenceControls /></CalculatorPreferenceProvider>);
}

beforeEach(() => { privacy.preferences = true; localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('preferência da calculadora', () => {
  it('começa visível e permite configurar pelo checkbox acessível em configurações', () => {
    render(<CalculatorPreferenceProvider session={mockSession()}>
      <SystemSettingsPage session={mockSession()} theme="dark" onThemeChange={() => {}} onPasswordChanged={() => {}} />
      <PreferenceControls />
    </CalculatorPreferenceProvider>);
    expect(screen.getByRole('checkbox', { name: 'Exibir calculadora flutuante' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Exibir calculadora flutuante' }));
    expect(screen.getByRole('checkbox', { name: 'Visibilidade' })).not.toBeChecked();
  });

  it('restaura apenas a preferência da mesma clínica e usuário e nunca armazena credenciais', () => {
    const first = mountPreference();
    fireEvent.click(screen.getByRole('checkbox'));
    first.unmount();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"version":1,"scopes":{"1:99":false}}');
    const restored = mountPreference();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    restored.rerender(<CalculatorPreferenceProvider session={mockSession({ clinicaId: 2 })}><PreferenceControls /></CalculatorPreferenceProvider>);
    expect(screen.getByRole('checkbox')).toBeChecked();
    restored.rerender(<CalculatorPreferenceProvider session={mockSession({ id: 100 })}><PreferenceControls /></CalculatorPreferenceProvider>);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('funciona em memória sem consentimento e só persiste após concedê-lo', () => {
    privacy.preferences = false;
    const mounted = mountPreference();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    privacy.preferences = true;
    mounted.rerender(<CalculatorPreferenceProvider session={mockSession()}><PreferenceControls /></CalculatorPreferenceProvider>);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).scopes['1:99']).toBe(false);
    privacy.preferences = false;
    mounted.rerender(<CalculatorPreferenceProvider session={mockSession()}><PreferenceControls /></CalculatorPreferenceProvider>);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    privacy.preferences = true;
    mounted.rerender(<CalculatorPreferenceProvider session={mockSession()}><PreferenceControls /></CalculatorPreferenceProvider>);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).scopes['1:99']).toBe(false);
  });

  it('descarta escolha de sessão sem consentimento ao desmontar', () => {
    privacy.preferences = false;
    const first = mountPreference();
    fireEvent.click(screen.getByRole('checkbox'));
    first.unmount();
    mountPreference();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it.each([
    'invalid-json',
    '{"version":0,"scopes":{"1:99":false}}',
    '{"version":1,"scopes":{"1:99":"false"}}',
    '{"version":1,"scopes":null}',
  ])('ignora registro inválido sem comprometer a interface: %s', stored => {
    localStorage.setItem(STORAGE_KEY, stored);
    mountPreference();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('permite usar a preferência quando acesso ao armazenamento falha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Disabled', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Disabled', 'SecurityError'); });
    mountPreference();
    act(() => fireEvent.click(screen.getByRole('checkbox')));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
