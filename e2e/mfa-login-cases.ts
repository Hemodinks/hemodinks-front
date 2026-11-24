import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Setup = (page: Page) => Promise<unknown>;
type Login = (page: Page) => Promise<unknown>;

// #150: tela do segundo fator. A API devolve so o desafio; nenhum token, cookie ou dado do usuario.
export function registerMfaLoginCases({ setup, login }: { setup: Setup; login: Login }) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test(`MFA: tela do codigo limita o campo e segue o layout do login (${viewport.width}px)`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await setup(page);
      await page.route('**/api/users/authenticate', route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ mfaDesafio: { token: 'mfa-e2e', expiraEm: new Date(Date.now() + 300_000).toISOString() } }),
      }));
      await login(page);

      await expect(page.getByRole('heading', { name: 'Confirme o acesso' })).toBeVisible();
      const code = page.getByLabel('Código', { exact: true });
      await expect(code).toBeFocused();
      const entrar = page.getByRole('button', { name: 'Entrar' });
      await expect(entrar).toBeDisabled();

      await code.fill('33333333333');
      await expect(code).toHaveValue('333333');
      await expect(entrar).toBeEnabled();
      await code.fill('abcdefghijklm');
      await expect(code).toHaveValue('ABCDE-FGHIJ');

      // Nada transborda o painel, nem no celular.
      const panel = await page.locator('.mfa-verification-panel').boundingBox();
      const input = await code.boundingBox();
      expect(input!.x + input!.width).toBeLessThanOrEqual(panel!.x + panel!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const accessibility = await new AxeBuilder({ page }).include('.mfa-verification-panel').analyze();
      expect(accessibility.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`mfa-${viewport.width}.png`) });

      await page.getByRole('button', { name: 'Voltar' }).click();
      await expect(page.getByRole('heading', { name: 'Confirme o acesso' })).toBeHidden();
    });
  }
}
