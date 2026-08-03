import { expect, test } from '@playwright/test';
import { expectNoGlobalHorizontalOverflow, loginViaUi, mockApi } from './hemodinks.support';

test('abre agenda e cadastro de usuário no perfil móvel real', async ({ page }) => {
  await mockApi(page);

  await loginViaUi(page, '/agenda');
  expect(await page.evaluate(() => window.innerWidth)).toBe(393);
  await expect(
    page.getByRole('heading', { name: 'Agenda e notificações', level: 1 }),
  ).toBeVisible();
  await expectNoGlobalHorizontalOverflow(page);

  await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
  await expect(page.getByLabel('Título')).toBeVisible();
  await expectNoGlobalHorizontalOverflow(page);

  await loginViaUi(page, '/usuarios');
  await page.getByRole('button', { name: 'Novo usuário' }).click();
  await expect(page.getByRole('heading', { name: 'Novo usuário' })).toBeVisible();
  await expect(page.getByLabel('Nome completo')).toBeVisible();
  await expectNoGlobalHorizontalOverflow(page);
});
