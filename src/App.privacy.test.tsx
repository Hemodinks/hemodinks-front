vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './services';
import { restoreSession } from './services/sessionService';
import { mockSession, toLoginResponse } from './test/appTestData';
import { renderAuthenticatedApp } from './test/appTestUi';
import { currentLegalAcceptance, currentPrivacyPreference, pendingLegalAcceptance, resetAppTestState } from './test/appTestSetup';
import { CONSENT_POLICY_VERSION, CONSENT_STORAGE_KEY, saveConsent } from './shared/privacy/consentStorage';

describe('App — privacidade e aceite jurídico', () => {
  beforeEach(resetAppTestState);

  it('exibe links legais no login e permite rejeitar opcionais sem bloquear o acesso', async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    render(<App />);

    const loginFooter = await screen.findByRole('contentinfo', { name: 'Links legais' });
    expect(loginFooter.querySelector('a[href="/termos-de-uso"]')).toHaveTextContent('Termos de Uso');
    expect(loginFooter.querySelector('a[href="/politica-de-privacidade"]')).toHaveTextContent('Política de Privacidade');
    expect(screen.getByRole('heading', { name: 'Sua privacidade no HemoDinks' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Rejeitar opcionais' }));
    expect(screen.queryByRole('heading', { name: 'Sua privacidade no HemoDinks' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      necessary: true,
      version: CONSENT_POLICY_VERSION,
      preferences: false,
      analytics: false,
    });
    expect(screen.getByRole('button', { name: 'Configurar cookies' })).toBeVisible();
  });

  it('abre e fecha as preferências por teclado com opcionais desmarcados no primeiro acesso', async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    const user = userEvent.setup();
    render(<App />);
    const configureButton = screen.getByRole('button', { name: 'Configurar' });

    await user.click(configureButton);
    const dialog = screen.getByRole('dialog', { name: 'Configurar cookies e armazenamentos' });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveAccessibleDescription('Escolha quais recursos opcionais podem ser utilizados neste navegador. Os recursos necessários permanecem ativos para autenticação, segurança e funcionamento da plataforma. Você pode alterar essas opções a qualquer momento.');
    expect(screen.getByRole('link', { name: 'Saiba mais no Aviso de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade');
    expect(screen.getByText('Sempre ativos')).toHaveAccessibleName('Cookies necessários sempre ativos');
    expect(screen.getByRole('checkbox', { name: /Preferências/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Análise/ })).not.toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Aceitar opcionais' })).toBeVisible();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Configurar cookies e armazenamentos' })).not.toBeInTheDocument();
    await waitFor(() => expect(configureButton).toHaveFocus());
  });

  it('salva uma configuração personalizada e a mantém em nova renderização', async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Configurar' }));
    await user.click(screen.getByRole('checkbox', { name: /Preferências/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));

    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      necessary: true,
      version: CONSENT_POLICY_VERSION,
      preferences: true,
      analytics: false,
    });
    firstRender.unmount();
    render(<App />);
    expect(screen.queryByRole('heading', { name: 'Sua privacidade no HemoDinks' })).not.toBeInTheDocument();
  });

  it('solicita nova decisão quando a versão armazenada está desatualizada', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      necessary: true,
      version: '1.0',
      updatedAt: '2026-09-02T12:00:00.000Z',
      preferences: true,
      analytics: true,
    }));

    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sua privacidade no HemoDinks' })).toBeVisible();
  });

  it('usa o backend vigente como fonte de verdade após o login e atualiza a cópia local', async () => {
    vi.mocked(api.getCurrentPrivacyPreference).mockResolvedValue({
      ...currentPrivacyPreference,
      preferencesEnabled: false,
      analyticsEnabled: false,
      updatedAtUtc: '2026-09-03T16:00:00Z',
    });

    await renderAuthenticatedApp();

    await waitFor(() => expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      necessary: true,
      version: '1.2',
      preferences: false,
      analytics: false,
      updatedAt: '2026-09-03T16:00:00Z',
    }));
    expect(api.updateCurrentPrivacyPreference).not.toHaveBeenCalled();
  });

  it('envia a escolha local vigente quando o usuário ainda não possui preferência no backend', async () => {
    vi.mocked(api.getCurrentPrivacyPreference).mockResolvedValue({
      ...currentPrivacyPreference,
      hasPreference: false,
      documentVersion: null,
      acceptedAtUtc: null,
      updatedAtUtc: null,
      preferencesEnabled: false,
      analyticsEnabled: false,
    });
    saveConsent({ preferences: true, analytics: false });

    await renderAuthenticatedApp();

    await waitFor(() => expect(api.updateCurrentPrivacyPreference).toHaveBeenCalledWith(
      'jwt-token',
      '1.2',
      true,
      false,
    ));
  });

  it('salva no backend uma alteração feita no modal durante a sessão autenticada', async () => {
    const { user } = await renderAuthenticatedApp();
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    await waitFor(() => expect(api.getCurrentPrivacyPreference).toHaveBeenCalledWith('jwt-token'));

    await user.click(screen.getByRole('button', { name: 'Configurar cookies' }));
    await user.click(screen.getByRole('checkbox', { name: /Preferências/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));

    await waitFor(() => expect(api.updateCurrentPrivacyPreference).toHaveBeenCalledWith(
      'jwt-token',
      '1.2',
      false,
      false,
    ));
  });

  it.each([
    ['/termos-de-uso', 'Termos de Uso', 'Versão: 1.1'],
    ['/politica-de-privacidade', 'Aviso de Privacidade do HemoDinks', 'Versão: 1.2'],
  ])('abre a rota pública %s sem carregar dados da aplicação', async (path, title, version) => {
    window.history.pushState({}, '', path);
    render(<App />);

    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    expect(screen.getByText(/Última atualização:/).closest('p')).toHaveTextContent(version);
    expect(api.listPublicClinics).not.toHaveBeenCalled();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /Li e estou ciente/ })).toBeDisabled();
    expect(screen.getByText(/Entre na plataforma para registrar este aceite/)).toBeVisible();
  });

  it.each([
    '/termos-de-uso',
    '/politica-de-privacidade',
  ])('permite concluir o aceite pendente dentro da página jurídica %s', async (path) => {
    vi.mocked(restoreSession).mockResolvedValue(toLoginResponse(mockSession()));
    window.history.pushState({}, '', path);
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue(pendingLegalAcceptance);
    const user = userEvent.setup();

    render(<App />);

    const checkbox = await screen.findByRole('checkbox', { name: /Li e estou ciente/ });
    const submit = screen.getByRole('button', { name: 'Aceitar e continuar' });
    expect(submit).toBeDisabled();

    await waitFor(() => expect(checkbox).toBeEnabled());
    await user.click(checkbox);
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(api.acceptCurrentLegalDocuments).toHaveBeenCalledWith('jwt-token', '1.1', '1.2');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('renderiza o conteúdo completo dos Termos 1.1 com links internos para privacidade', () => {
    window.history.pushState({}, '', '/termos-de-uso');
    render(<App />);

    expect(screen.getByRole('heading', { name: '1. Uso do sistema' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '11. Dúvidas e suporte' })).toBeVisible();
    expect(screen.getByText(/A plataforma não substitui avaliações/)).toBeVisible();
    const privacyLinks = screen.getAllByRole('link', { name: /Aviso de Privacidade/ });
    expect(privacyLinks.length).toBeGreaterThanOrEqual(2);
    expect(privacyLinks.every((link) => link.getAttribute('href') === '/politica-de-privacidade')).toBe(true);
  });

  it('bloqueia os módulos até o usuário aceitar os documentos jurídicos vigentes', async () => {
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue(pendingLegalAcceptance);
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Documentos jurídicos atualizados' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ler os Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso');
    expect(screen.getByRole('link', { name: 'Ler o Aviso de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade');
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', {
      name: 'Li e estou ciente dos Termos de Uso e do Aviso de Privacidade do HemoDinks.',
    }));
    await user.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));

    expect(api.acceptCurrentLegalDocuments).toHaveBeenCalledWith('jwt-token', '1.1', '1.2');
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  });

  it('não exibe o bloqueio quando a versão vigente já foi aceita', async () => {
    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Documentos jurídicos atualizados' })).not.toBeInTheDocument();
    expect(api.acceptCurrentLegalDocuments).not.toHaveBeenCalled();
  });

  it('exige novo aceite quando a versão registrada está desatualizada', async () => {
    vi.mocked(api.getCurrentLegalAcceptance).mockResolvedValue({
      ...pendingLegalAcceptance,
      termsOfUse: {
        ...pendingLegalAcceptance.termsOfUse,
        acceptedVersion: '1.0',
        acceptedAtUtc: '2026-09-02T12:00:00Z',
      },
    });

    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Documentos jurídicos atualizados' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Painel inicial' })).not.toBeInTheDocument();
  });

  it('mantém o aceite persistido pelo servidor após logout e novo login', async () => {
    vi.mocked(api.getCurrentLegalAcceptance)
      .mockResolvedValueOnce(pendingLegalAcceptance)
      .mockResolvedValue(currentLegalAcceptance);
    const { user } = await renderAuthenticatedApp();
    await user.click(await screen.findByRole('checkbox', { name: /Li e estou ciente/ }));
    await user.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }));
    await user.click(screen.getByRole('button', { name: /sair/i }));
    await user.clear(await screen.findByLabelText('Email'));
    await user.type(await screen.findByLabelText('Email'), mockSession().user.email);
    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    expect(api.getCurrentLegalAcceptance).toHaveBeenCalledTimes(2);
    expect(api.acceptCurrentLegalDocuments).toHaveBeenCalledTimes(1);
  });
});
