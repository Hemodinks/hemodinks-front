import { expect, test } from '@playwright/test';
import { LOGIN_PASSWORD, mockApi } from './hemodinks.support';

test('autentica e renderiza o dashboard nos navegadores suportados', async ({ page }) => {
  const apiState = await mockApi(page);

  await page.goto('/');
  await page.getByLabel('Clínica').selectOption('1');
  await page.getByLabel('Email').fill('gmarcone@gmail.com');
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  expect(apiState.loginPayload).toMatchObject({
    email: 'gmarcone@gmail.com',
    senha: LOGIN_PASSWORD,
  });
});
