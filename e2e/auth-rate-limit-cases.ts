import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Session = { token: string; user: { email: string; id: number } };
const genericMessage = 'Muitas tentativas. Aguarde antes de tentar novamente.';
const expiredMessage = 'Espera encerrada. Você pode tentar novamente.';
const password = 'acesso-teste-ci';
const loginButton = (page: Page) => page.getByRole('button', { name: 'Entrar', exact: true });
const limited = (route: Route, seconds = 30) => route.fulfill({
  status: 429,
  headers: { 'Retry-After': String(seconds), 'Access-Control-Expose-Headers': 'Retry-After', 'Cache-Control': 'no-store' },
  // A deliberately different body value verifies the API header has precedence.
  json: { code: 'rate_limited', retryAfterSeconds: 90, message: 'private-account-details' },
});

async function freezeClock(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}

export function registerAuthRateLimitCases<TSession extends Session>({ setup, login, session }: {
  setup: (page: Page, session?: TSession) => Promise<{ authenticated: boolean }>;
  login: (page: Page, route?: string, session?: TSession) => Promise<void>;
  session: TSession;
}) {
  test('limite de acesso: login individual normal mantém clínica e sessão', async ({ page }) => {
    const state = await setup(page);
    const calls: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (/\/api\/users\/(login-context|authenticate)$/.test(path)) calls.push(path);
    });
    await login(page);
    await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible();
    expect(state.authenticated).toBe(true);
    expect(calls).toEqual(['/api/users/login-context', '/api/users/authenticate']);
    await expect(page.getByRole('button', { name: 'Menu do usuário' })).toBeVisible();
  });

  for (const endpoint of ['login-context', 'authenticate']) {
    test(`limite de acesso: 429 em ${endpoint}, espera mobile e retomada somente manual`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await setup(page);
      await freezeClock(page);
      let calls = 0;
      await page.route(`**/api/users/${endpoint}`, async route => {
        calls++;
        if (calls === 1) await limited(route);
        else await route.fallback();
      });
      await login(page);
      await expect(page.getByRole('alert')).toHaveText(genericMessage);
      await expect(page.locator('#auth-wait-status')).toContainText('Aguarde 30 s.');
      await expect(loginButton(page)).toBeDisabled();
      await expect(page.locator('#login-password')).toHaveValue('');
      await expect(page.getByLabel('Email', { exact: true })).toHaveValue(session.user.email);
      await expect(page.getByRole('button', { name: 'Esqueci minha senha' })).toBeEnabled();
      await page.locator('#login-password').fill(password);
      await page.locator('#login-password').press('Enter');
      expect(calls).toBe(1);
      await page.clock.fastForward(29_000);
      await expect(loginButton(page)).toBeDisabled();
      await page.clock.fastForward(1_000);
      await expect(page.locator('#auth-wait-status')).toContainText(expiredMessage);
      await expect(loginButton(page)).toBeEnabled();
      expect(calls).toBe(1);
      await page.clock.fastForward(5_000);
      expect(calls).toBe(1);
      await page.clock.resume();
      await loginButton(page).click();
      await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible();
      expect(calls).toBe(2);
      expect(await page.content()).not.toContain('private-account-details');
    });

    test(`limite de acesso: acessibilidade mobile em ${endpoint} nos temas claro e escuro`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await setup(page);
      await page.route(`**/api/users/${endpoint}`, route => limited(route, 120));
      await login(page);
      await expect(page.getByRole('alert')).toHaveText(genericMessage);
      await expect(loginButton(page)).toBeDisabled();
      // axe and screenshots use browser timers. Keep the normal clock for these
      // audits; the separate timing case above controls the wait deterministically.
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        const audit = await new AxeBuilder({ page }).include('.login-panel').withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(audit.violations).toEqual([]);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await testInfo.attach(`429-${endpoint}-${theme}-375px`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      }
    });
  }

  test('limite de acesso: tentativa pendente rejeita duplo envio e Enter repetido', async ({ page }) => {
    await setup(page);
    let calls = 0;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/users/login-context', async route => {
      calls++;
      await pending;
      await limited(route);
    });
    await login(page);
    await expect.poll(() => calls).toBe(1);
    await page.locator('.login-panel form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.keyboard.press('Enter');
    expect(calls).toBe(1);
    release();
    await expect(page.getByRole('alert')).toHaveText(genericMessage);
    expect(calls).toBe(1);
  });

  test('limite de acesso: trocar email não herda espera e voltar preserva bloqueio original', async ({ page }) => {
    await setup(page);
    await freezeClock(page);
    const emails: string[] = [];
    await page.route('**/api/users/login-context', async route => {
      const { email } = route.request().postDataJSON();
      emails.push(email);
      await limited(route, email === session.user.email ? 30 : 5);
    });
    await login(page);
    await expect(loginButton(page)).toBeDisabled();
    await page.getByLabel('Email', { exact: true }).fill('other@example.com');
    await expect(loginButton(page)).toBeEnabled();
    await page.locator('#login-password').fill(password);
    await loginButton(page).click();
    await expect(page.locator('#auth-wait-status')).toContainText('Aguarde 5 s.');
    await page.getByLabel('Email', { exact: true }).fill(session.user.email.toUpperCase());
    await expect(loginButton(page)).toBeDisabled();
    await expect(page.locator('#auth-wait-status')).toContainText('Aguarde 30 s.');
    await page.clock.fastForward(5_000);
    await expect(loginButton(page)).toBeDisabled();
    await page.getByLabel('Email', { exact: true }).fill('other@example.com');
    await expect(loginButton(page)).toBeEnabled();
    expect(emails).toEqual([session.user.email, 'other@example.com']);
  });

  test('limite de acesso: usuários independentes na mesma rede não compartilham bloqueio', async ({ page, browser }) => {
    await setup(page);
    await page.route('**/api/users/login-context', route => limited(route));
    await login(page);
    await expect(loginButton(page)).toBeDisabled();
    const context = await browser.newContext();
    try {
      const other = await context.newPage();
      await other.addInitScript(() => localStorage.setItem('hemodinks.privacy-consent', JSON.stringify({ necessary: true, version: '1.1', preferences: true, analytics: false })));
      const second = { ...session, user: { ...session.user, email: 'other@example.com' } };
      await setup(other, second);
      await login(other, '/', second);
      await expect(other.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible();
      await expect(loginButton(page)).toBeDisabled();
    } finally { await context.close(); }
  });

  test('limite de acesso: operador unificado preserva espera por identidade e limpa PIN', async ({ page }) => {
    const state = await setup(page);
    await freezeClock(page);
    await page.route('**/api/users/authenticate', route => route.fulfill({ json: { equipeDesafio: {
      token: 'fictitious-challenge', equipeId: 7, equipeNome: 'Equipe de teste', modoIdentificacao: 'Pin',
      expiraEm: new Date(Date.now() + 600_000).toISOString(),
      operadores: [{ id: 1, nome: 'Operador A', exigePin: true }, { id: 2, nome: 'Operador B', exigePin: true }],
    } } }));
    const operators: number[] = [];
    await page.route('**/api/equipe-auth/identificar', async route => {
      const { operadorId } = route.request().postDataJSON();
      operators.push(operadorId);
      if (operators.length === 1) await limited(route);
      else { state.authenticated = true; await route.fulfill({ json: { ...session.user, token: session.token } }); }
    });
    await login(page);
    const select = page.getByLabel('Membro da Equipe');
    const pin = page.getByLabel('PIN individual');
    const submit = page.getByRole('button', { name: 'Continuar', exact: true });
    await select.selectOption('1');
    await pin.fill('123456');
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText(genericMessage);
    await expect(pin).toHaveValue('');
    await expect(submit).toBeDisabled();
    await select.selectOption('2');
    await expect(submit).toBeEnabled();
    await pin.fill('654321');
    await select.selectOption('1');
    await expect(pin).toHaveValue('');
    await expect(submit).toBeDisabled();
    await page.clock.fastForward(30_000);
    await expect(page.locator('#auth-wait-status')).toContainText(expiredMessage);
    expect(operators).toEqual([1]);
    await page.clock.resume();
    await pin.fill('123456');
    await submit.click();
    await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible();
    expect(operators).toEqual([1, 1]);
  });

  test('limite de acesso: recuperação espera sem bloquear login e permite reenvio manual', async ({ page }) => {
    await setup(page);
    await freezeClock(page);
    let calls = 0;
    await page.route('**/api/users/password/reset', async route => {
      calls++;
      if (calls === 1) await limited(route, 5);
      else await route.fulfill({ json: { message: 'Se houver uma conta, as instruções serão enviadas.' } });
    });
    await page.goto('/');
    await expect(loginButton(page)).toBeEnabled();
    await page.getByLabel('Email', { exact: true }).fill(session.user.email);
    const recover = page.getByRole('button', { name: 'Esqueci minha senha' });
    await recover.click();
    await expect(page.getByRole('alert')).toHaveText(genericMessage);
    await expect(recover).toBeDisabled();
    await expect(loginButton(page)).toBeEnabled();
    await page.clock.fastForward(5_000);
    await expect(recover).toBeEnabled();
    expect(calls).toBe(1);
    await recover.click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(calls).toBe(2);
  });

  test('limite de acesso: confirmação de redefinição respeita espera sem repetir senha', async ({ page }) => {
    await setup(page);
    await freezeClock(page);
    let calls = 0;
    await page.route('**/api/users/password/reset/confirm', async route => {
      calls++;
      if (calls === 1) await limited(route, 5);
      else await route.fulfill({ json: { message: 'Senha redefinida com sucesso.' } });
    });
    await page.goto('/reset-password?token=fictitious-reset-token');
    await page.getByLabel('Nova senha', { exact: true }).fill('uma frase senha longa');
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('uma frase senha longa');
    const submit = page.getByRole('button', { name: 'Redefinir senha', exact: true });
    await submit.click();
    await expect(page.getByRole('alert')).toHaveText(genericMessage);
    await expect(submit).toBeDisabled();
    await page.getByLabel('Confirmar nova senha', { exact: true }).press('Enter');
    expect(calls).toBe(1);
    await page.clock.fastForward(5_000);
    await expect(submit).toBeEnabled();
    await expect(page.locator('#auth-wait-status')).toContainText(expiredMessage);
    expect(calls).toBe(1);
    await submit.click();
    await expect(page.locator('#login-password')).toBeVisible();
    expect(calls).toBe(2);
  });

  test('limite de acesso: 429 autenticado não encerra sessão nem renova ou repete request', async ({ page }) => {
    const state = await setup(page);
    await login(page, '/opcoes');
    await expect(page.getByRole('button', { name: 'Menu do usuário' })).toBeVisible();
    const calls: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (/\/api\/session\/(sair|renovar|restaurar)$/.test(path) || path === '/api/monitoramento/seguranca') calls.push(path);
    });
    await page.route('**/api/monitoramento/seguranca?**', route => limited(route));
    await page.getByRole('button', { name: 'Segurança', exact: true }).click();
    await expect(page.locator('.security-monitoring').getByRole('alert')).toBeVisible();
    const initialReads = calls.filter(path => path === '/api/monitoramento/seguranca').length;
    expect(initialReads).toBeGreaterThanOrEqual(1);
    expect(initialReads).toBeLessThanOrEqual(2); // StrictMode may abort the initial read.
    await freezeClock(page);
    await page.clock.fastForward(35_000);
    await expect(page.getByRole('button', { name: 'Menu do usuário' })).toBeVisible();
    await expect(page.locator('#login-password')).toHaveCount(0);
    expect(state.authenticated).toBe(true);
    expect(calls.filter(path => path.startsWith('/api/session/'))).toEqual([]);
    expect(calls.filter(path => path === '/api/monitoramento/seguranca')).toHaveLength(initialReads);
    await page.getByRole('button', { name: 'Configurações', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Tema do sistema' })).toBeVisible();
  });
}
