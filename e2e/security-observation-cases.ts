import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Session = { token: string; user: { perfilId: number } };
export function registerSecurityObservationCases<TSession extends Session>({ setup, login, session }: {
  setup: (page: Page, session?: TSession) => Promise<unknown>;
  login: (page: Page, route?: string, session?: TSession) => Promise<void>;
  session: TSession;
}) {
  // Fixtures follow API #148's actual SecurityObservationPage, without invented totals/filters.
  const event = { timestamp: '2026-10-07T19:00:00Z', kind: 'AuthenticationSucceeded', operation: 'login', reason: 'completed', clinicId: 1 };
  const privateValue = 'observation-private-canary';
  const open = async (page: Page, perfilId: number) => {
    const identity = { ...session, user: { ...session.user, perfilId } };
    await setup(page, identity);
    await login(page, '/opcoes', identity);
  };

  test('observabilidade de segurança: clínica, paginação, privacidade e acessibilidade responsiva', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', message => logs.push(message.text()));
    await open(page, 1);
    const queries: string[] = [];
    await page.route('**/api/monitoramento/seguranca?**', async route => {
      const url = new URL(route.request().url());
      queries.push(url.search);
      const current = Number(url.searchParams.get('page'));
      await route.fulfill({ json: { page: current, pageSize: 25, items: current === 1 ? Array.from({ length: 25 }, () => ({
        ...event, accountKey: privateValue, requestId: privateValue, email: privateValue, token: privateValue,
      })) : [] } });
    });
    await page.getByRole('button', { name: 'Segurança', exact: true }).click();
    const panel = page.locator('.security-monitoring');
    await expect(panel.getByRole('heading', { name: 'Autenticação concluída' })).toHaveCount(25);
    await expect(panel).toContainText('Eventos da clínica atual');
    await expect(panel).not.toContainText('Visão global');
    await expect(panel).not.toContainText(privateValue);
    // The development server uses StrictMode, which can start and abort the
    // initial read twice. Pagination must issue exactly one read per action.
    const initialReads = queries.length;
    expect(initialReads).toBeGreaterThanOrEqual(1);
    expect(initialReads).toBeLessThanOrEqual(2);
    expect(queries.every(query => query === '?page=1&pageSize=25')).toBe(true);
    for (const width of [1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).include('.options-workspace').withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(audit.violations).toEqual([]);
    }
    await panel.getByRole('button', { name: 'Próxima página de eventos' }).click();
    await expect(panel).toContainText('Nenhum evento de segurança nesta página.');
    await expect(panel.getByRole('button', { name: 'Próxima página de eventos' })).toBeDisabled();
    await panel.getByRole('button', { name: 'Página anterior de eventos' }).click();
    await expect(panel).toContainText('Página 1 · 25 evento(s) nesta página');
    expect(queries.slice(initialReads)).toEqual(['?page=2&pageSize=25', '?page=1&pageSize=25']);
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(storage).not.toContain(privateValue);
    expect(logs.join('\n')).not.toContain(privateValue);
    expect(await page.content()).not.toContain(privateValue);
  });

  test('observabilidade de segurança: plataforma apresenta eventos globais autorizados', async ({ page }) => {
    await open(page, 5);
    await page.route('**/api/monitoramento/seguranca?**', route => route.fulfill({ json: { page: 1, pageSize: 25, items: [
      { ...event, clinicId: 2 }, { ...event, kind: 'SuspiciousPattern', operation: 'detection', reason: 'multiple_accounts', clinicId: null },
    ] } }));
    await page.getByRole('button', { name: 'Segurança', exact: true }).click();
    const panel = page.locator('.security-monitoring');
    await expect(panel).toContainText('Visão global da plataforma');
    await expect(panel).toContainText('Clínica 2');
    await expect(panel).toContainText('Plataforma / pré-login');
    await expect(panel).toContainText('Recusas em múltiplas contas');
    await expect(panel.getByRole('button', { name: /bloquear|revogar|notificar/i })).toHaveCount(0);
  });

  test('observabilidade de segurança: perfil não administrativo não acessa nem consulta eventos', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/monitoramento/seguranca?**', route => { calls++; return route.fulfill({ status: 403, json: {} }); });
    await open(page, 2);
    await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Segurança', exact: true })).toHaveCount(0);
    expect(calls).toBe(0);
  });

  test('observabilidade de segurança: falhas são locais e preservam a sessão normal', async ({ page }) => {
    await open(page, 1);
    let status = 401;
    await page.route('**/api/monitoramento/seguranca?**', route => route.fulfill({ status, json: { message: privateValue } }));
    await page.getByRole('button', { name: 'Segurança', exact: true }).click();
    const panel = page.locator('.security-monitoring');
    for (const next of [403, 503]) {
      await expect(panel.getByRole('alert')).toContainText('Não foi possível carregar');
      await expect(panel.getByRole('alert')).not.toContainText(privateValue);
      await expect(page.getByRole('button', { name: 'Menu do usuário' })).toBeVisible();
      await expect(page.locator('#login-password')).toHaveCount(0);
      status = next;
      await panel.getByRole('button', { name: 'Atualizar eventos' }).click();
    }
    await expect(panel.getByRole('alert')).toContainText('Não foi possível carregar');
    await page.getByRole('button', { name: 'Configurações', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Tema do sistema' })).toBeVisible();
    await expect(page.locator('#login-password')).toHaveCount(0);
  });
}
