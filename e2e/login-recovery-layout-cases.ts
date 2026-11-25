import { expect, test, type Page } from '@playwright/test';

type Helpers = { setup: (page: Page) => Promise<unknown> };
const shotDir = process.env.LAYOUT_SHOTS_DIR;

// Fluxo "Esqueci minha senha": tela própria de recuperação, sem senha nem "Entrar".
export function registerLoginRecoveryLayoutCases(helpers: Helpers) {
  for (const width of [390, 1440]) {
    test(`recuperação de senha em tela própria em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await helpers.setup(page);
      let resets = 0;
      await page.route('**/api/users/password/reset', async (route) => {
        resets++;
        await route.fulfill({ json: { message: 'Enviamos um email com o link para redefinir sua senha.', mode: 'email-token' } });
      });
      await page.goto('/');
      await page.getByLabel('Email', { exact: true }).fill('admin@hemodinks.com');
      await page.getByRole('button', { name: 'Esqueci minha senha' }).click();

      await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toHaveCount(0);
      await expect(page.locator('#login-password')).toHaveCount(0);
      await expect(page.getByLabel('Email', { exact: true })).toHaveValue('admin@hemodinks.com');
      expect(resets).toBe(0);
      if (shotDir) await page.screenshot({ path: `${shotDir}/recovery-${width}.png`, fullPage: true });

      // Enter no email envia as instruções (botão principal do formulário).
      await page.getByLabel('Email', { exact: true }).press('Enter');
      await expect(page.getByText('Enviamos um email com o link para redefinir sua senha.')).toBeVisible();
      await expect.poll(() => resets).toBe(1);
      await expect(page.getByRole('button', { name: 'Enviar instruções' })).toHaveCount(0);
      if (shotDir) await page.screenshot({ path: `${shotDir}/recovery-sent-${width}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

      await page.getByRole('button', { name: 'Voltar para o login' }).click();
      await expect(page.getByRole('heading', { name: 'Acesso ao sistema' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    });
  }
}
