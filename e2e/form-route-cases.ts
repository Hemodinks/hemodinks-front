import { expect, test, type Page } from '@playwright/test';

type Dependencies = {
  setup: (page: Page) => Promise<unknown>;
  login: (page: Page, route?: string) => Promise<void>;
};

// #202: create/edit forms have their own URL, so back/forward, reload and shared links keep the screen.
export function registerFormRouteCases({ setup, login }: Dependencies) {
  test.describe('rotas de formulário', () => {
    test('editar paciente: voltar, avançar e recarregar preservam a tela', async ({ page }) => {
      await setup(page);
      await login(page, '/pacientes');
      await page.locator('.patients-table tbody tr').first().getByTitle('Editar').click();
      const editHeading = page.getByRole('heading', { name: 'Editar paciente' });
      await expect(editHeading).toBeVisible();
      await expect(page).toHaveURL(/\/pacientes\/\d+$/);
      const editUrl = page.url();

      await page.goBack();
      await expect(page).toHaveURL(/\/pacientes$/);
      await expect(page.locator('.patients-table tbody tr').first()).toBeVisible();
      await expect(editHeading).toHaveCount(0);

      await page.goForward();
      await expect(page).toHaveURL(editUrl);
      await expect(editHeading).toBeVisible();

      await page.reload();
      await expect(editHeading).toBeVisible();
      await expect(page).toHaveURL(editUrl);
    });

    test('novo paciente: recarregar mantém o cadastro e voltar retorna à lista', async ({ page }) => {
      await setup(page);
      await login(page, '/pacientes');
      await page.getByRole('button', { name: 'Novo paciente' }).first().click();
      const newHeading = page.getByRole('heading', { name: 'Novo paciente' });
      await expect(newHeading).toBeVisible();
      await expect(page).toHaveURL(/\/pacientes\/novo$/);

      await page.reload();
      await expect(newHeading).toBeVisible();

      await page.goBack();
      await expect(page).toHaveURL(/\/pacientes$/);
      await expect(newHeading).toHaveCount(0);
    });

    test('rota de formulário inválida volta ao painel', async ({ page }) => {
      await setup(page);
      await login(page, '/dashboard');
      await page.goto('/pacientes/abc');
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    });
  });
}
