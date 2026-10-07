import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Session = { token: string; user: { id: number; precisaTrocarSenha: boolean; perfilId: number } };
export function registerPasswordPolicyCases<TSession extends Session>({ setup, login, session }: {
  setup: (page: Page, session?: TSession) => Promise<{ authenticated: boolean }>;
  login: (page: Page, route?: string, session?: TSession) => Promise<void>;
  session: TSession;
}) {
  for (const width of [1440, 1280, 768, 390]) {
    test('política de senha: recuperação acessível em ' + width, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await setup(page);
      let attempts = 0;
      const bodies: Array<{ novaSenha: string }> = [];
      await page.route('**/api/users/password/reset/confirm', async route => {
        bodies.push(route.request().postDataJSON());
        attempts++;
        await route.fulfill(attempts < 3 ? { status: attempts === 1 ? 400 : 503, json: { code: attempts === 1 ? 'password_compromised' : 'password_policy_unavailable' } } : { json: { message: 'Senha redefinida com sucesso' } });
      });
      await page.goto('/reset-password?token=fictitious-token');
      const password = page.getByLabel('Nova senha', { exact: true });
      const confirm = page.getByLabel('Confirmar nova senha', { exact: true });
      await password.fill('password'); await confirm.fill('password');
      const submit = page.getByRole('button', { name: 'Redefinir senha', exact: true });
      await submit.click();
      await expect(page.getByRole('alert')).toContainText('Escolha outra senha');
      await expect(password).toHaveAttribute('aria-describedby', 'new-password-api-error');
      await expect(password).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('alert')).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const a11y = await new AxeBuilder({ page }).include('.password-required').withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(a11y.violations).toEqual([]);
      await submit.click();
      await expect(page.getByRole('alert')).toContainText('Não foi possível verificar');
      const phrase = '  uma frase senha sem composicao obrigatoria  ';
      await password.fill(phrase); await confirm.fill(phrase);
      await submit.click();
      await expect(page.locator('#login-password')).toBeVisible();
      expect(bodies[2].novaSenha).toBe(phrase);
    });
  }
  for (const temporary of [false, true]) {
    test('política de senha: primeiro acesso ' + (temporary ? 'temporário' : 'com senha atual'), async ({ page }) => {
      const claims = { temporary_password: temporary ? 'true' : 'false', precisaTrocarSenha: 'true', exp: Math.floor(Date.now() / 1000) + 3600 };
      const forced = { ...session, token: 'test.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature', user: { ...session.user, precisaTrocarSenha: true } };
      const state = await setup(page, forced); state.authenticated = true;
      let calls = 0;
      const path = temporary ? '/api/users/password/temporary/complete' : '/api/users/' + session.user.id + '/password';
      await page.route('**' + path, async route => {
        calls++;
        await route.fulfill(calls === 1 ? { status: 400, json: { code: 'password_compromised' } } : { json: { message: 'Senha alterada', precisaTrocarSenha: false } });
      });
      await login(page, '/', forced);
      if (!temporary) await page.getByLabel('Senha atual', { exact: true }).fill('senha atual');
      await page.getByLabel('Nova senha', { exact: true }).fill('password');
      await page.getByLabel('Confirmar nova senha', { exact: true }).fill('password');
      await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('Escolha outra senha');
      await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await page.getByLabel('Nova senha', { exact: true }).fill('uma frase senha longa');
      await page.getByLabel('Confirmar nova senha', { exact: true }).fill('uma frase senha longa');
      await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
      await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0);
      expect(calls).toBe(2);
    });
  }
  test('política de senha: provisionamento preserva clínica e associa administrador e equipe', async ({ page }) => {
    const admin = { ...session, user: { ...session.user, perfilId: 5 } };
    await setup(page, admin);
    await login(page, '/clinicas', admin);
    await page.getByRole('button', { name: 'Nova clinica', exact: true }).click();
    await page.getByLabel('Nome da clinica').fill('Clínica nova'); await page.getByLabel('Slug', { exact: true }).fill('nova');
    await page.getByLabel('CNPJ', { exact: true }).fill('11222333000181');
    await page.getByLabel('Nome', { exact: true }).fill('Administrador'); await page.getByLabel('Email', { exact: true }).fill('admin@example.com');
    await page.getByLabel('Senha inicial', { exact: true }).fill('password');
    await page.getByLabel('Nome da equipe').fill('Equipe nova'); await page.getByLabel('E-mail coletivo').fill('equipe@example.com');
    await page.getByLabel('Senha coletiva inicial', { exact: true }).fill('password');
    await page.route('**/api/platform/clinicas', async route => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { code: 'password_policy_unavailable' } });
      else await route.fallback();
    });
    const baselineWidths = new Map<number, number>();
    for (const width of [1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      baselineWidths.set(width, await page.evaluate(() => document.documentElement.scrollWidth));
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Salvar clinica' }).click();
    await expect(page.getByRole('alert')).toContainText('Não foi possível verificar');
    for (const label of ['Senha inicial', 'Senha coletiva inicial']) await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-describedby', 'clinic-password-api-error');
    await expect(page.getByLabel('Nome da clinica')).toHaveValue('Clínica nova');
    const a11y = await new AxeBuilder({ page }).include('.clinic-form-panel').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(a11y.violations).toEqual([]);
    for (const width of [1440, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      // The existing clinic table overflows on mobile. The password UX must
      // fit the viewport and must not increase that pre-existing page overflow.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(baselineWidths.get(width)!);
      for (const selector of ['.clinic-form-panel', '#clinic-password-api-error']) {
        const bounds = await page.locator(selector).boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
    }
  });
}
