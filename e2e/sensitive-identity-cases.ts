import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Session = { token: string; user: { id: number; perfilId: number; email: string } };
export function registerSensitiveIdentityCases<TSession extends Session>({ setup, login, session }: {
  setup: (page: Page, session?: TSession) => Promise<unknown>;
  login: (page: Page, route?: string, session?: TSession) => Promise<void>;
  session: TSession;
}) {
  const requestId = '12345678-1234-1234-1234-123456789012';
  const credential = 'private-current-credential';
  const code = 'c'.repeat(64);
  const open = async (page: Page) => {
    await page.getByLabel('Novo email de autenticação').fill('new@example.com');
    await page.getByRole('button', { name: 'Continuar alteração de email' }).click();
  };
  test('identidade sensível: email pendente, cancelamento, teclado, privacidade e acessibilidade responsiva', async ({ page }) => {
    const logs: string[] = []; page.on('console', msg => logs.push(msg.text()));
    await setup(page); await login(page, '/opcoes');
    let attempts = 0; let cancelled = 0;
    await page.route('**/api/users/email/change', async route => {
      attempts++;
      expect(route.request().postDataJSON()).toEqual({ senhaAtual: credential, novoEmail: 'new@example.com' });
      await route.fulfill(attempts === 1 ? { status: 403, json: { code: 'identity_revalidation_failed', message: credential } }
        : { json: { requestId, expiresAt: new Date(Date.now() + 600000).toISOString() } });
    });
    await page.route('**/api/users/email/change/cancel', async route => {
      expect(route.request().postDataJSON()).toEqual({ requestId }); cancelled++;
      await route.fulfill({ status: 204 });
    });
    await open(page);
    const password = page.getByLabel('Senha atual da conta individual', { exact: true });
    await expect(password).toBeFocused();
    await password.fill(credential);
    await page.getByRole('button', { name: 'Enviar confirmação' }).click();
    await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar');
    await expect(password).toHaveValue('');
    await expect(password).toHaveAttribute('aria-describedby', 'email-change-error');
    await expect(page.locator('#login-password')).toHaveCount(0);
    for (const width of [1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(audit.violations).toEqual([]);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const opener = page.getByRole('button', { name: 'Continuar alteração de email' });
    await expect(opener).toBeFocused();
    await expect(page.getByLabel('Novo email de autenticação')).toHaveValue('new@example.com');
    await opener.click(); await password.fill(credential);
    await page.getByRole('button', { name: 'Enviar confirmação' }).click();
    const proof = page.getByLabel('Código de confirmação', { exact: true });
    await expect(proof).toBeFocused(); await proof.fill(code);
    await expect(page.getByRole('dialog')).toContainText('O email ainda não foi alterado');
    await page.getByRole('button', { name: 'Confirmar email', exact: true }).focus();
    await page.keyboard.press('Tab'); await expect(proof).toBeFocused();
    await page.keyboard.press('Escape');
    await expect.poll(() => cancelled).toBe(1);
    await expect(page.getByLabel('Novo email de autenticação')).toHaveValue('new@example.com');
    const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    for (const secret of [credential, code, requestId]) {
      expect(stored).not.toContain(secret); expect(logs.join('\n')).not.toContain(secret);
      expect(page.url()).not.toContain(secret); expect(await page.content()).not.toContain(secret);
    }
  });

  test('identidade sensível: email confirmado exige novo login somente após sucesso do backend', async ({ page }) => {
    await setup(page); await login(page, '/opcoes');
    await page.route('**/api/users/email/change', route => route.fulfill({ json: { requestId, expiresAt: new Date(Date.now() + 600000).toISOString() } }));
    await page.route('**/api/users/email/change/confirm', route => {
      expect(route.request().postDataJSON()).toEqual({ requestId, code });
      return route.fulfill({ json: { code: 'identity_changed' } });
    });
    await open(page); await page.getByLabel('Senha atual da conta individual', { exact: true }).fill(credential);
    await page.getByRole('button', { name: 'Enviar confirmação' }).click();
    await page.getByLabel('Código de confirmação', { exact: true }).fill(code);
    await expect(page.getByRole('button', { name: 'Menu do usuário' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar email', exact: true }).click();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByText('Email confirmado e alterado. Entre novamente com o novo email.')).toBeVisible();
  });

  test('identidade sensível: senha atual uma vez, recusa local e sucesso encerra sessão', async ({ page }) => {
    await setup(page); await login(page, '/dashboard');
    let calls = 0;
    await page.route('**/api/users/' + session.user.id + '/password', route => {
      calls++;
      expect(route.request().postDataJSON()).toEqual({ senhaAtual: credential, novaSenha: 'uma frase nova de acesso' });
      return route.fulfill(calls === 1 ? { status: 403, json: { code: 'identity_revalidation_failed' } }
        : { json: { id: session.user.id, precisaTrocarSenha: false, message: 'Senha alterada. Entre novamente com a nova senha.' } });
    });
    await expect(page.getByRole('heading', { name: 'Painel inicial', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Opções', exact: true }).click();
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByLabel('Senha atual', { exact: true }).fill(credential);
      await page.getByLabel('Nova senha', { exact: true }).fill('uma frase nova de acesso');
      await page.getByLabel('Confirmar nova senha', { exact: true }).fill('uma frase nova de acesso');
      await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
      if (attempt === 0) {
        await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar');
        await expect(page.getByLabel('Senha atual', { exact: true })).toHaveValue('');
        await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue('');
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }
    }
    await expect(page.locator('#login-password')).toBeVisible(); expect(calls).toBe(2);
  });

  test('identidade sensível: cadastro próprio preserva rascunho e não permite alterar email pelo cadastro comum', async ({ page }) => {
    const identity = { ...session, user: { ...session.user, perfilId: 2 } };
    await setup(page, identity);
    await page.route('**/api/users/' + session.user.id, route => route.fulfill({ json: {
      ...identity.user, telefone: '81999999999', ativo: true, dataNascimento: '', arquivos: [], arquivosCount: 0,
    } }));
    await login(page, '/meu-cadastro', identity);
    // Medical accounts enter the dashboard after login by the existing navigation rule.
    await page.getByRole('complementary', { name: 'Menu da clínica' }).getByRole('button', { name: 'Meu cadastro', exact: true }).click();
    await page.getByLabel('Nome completo').fill('Rascunho preservado');
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('readonly');
    await open(page); await page.keyboard.press('Escape');
    await expect(page.getByLabel('Nome completo')).toHaveValue('Rascunho preservado');
    await expect(page.getByLabel('Novo email de autenticação')).toHaveValue('new@example.com');
  });
}
