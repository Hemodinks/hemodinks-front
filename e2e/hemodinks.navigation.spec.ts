import { expect, test } from '@playwright/test';
import {
  LOGIN_PASSWORD,
  expectNoGlobalHorizontalOverflow,
  loginViaUi,
  mockApi,
} from './hemodinks.support';

test('faz login pelo formulario e abre o dashboard', async ({ page }) => {
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

test('navega pelos fluxos principais autenticados', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir pacientes/i })).toBeVisible();

  await page.getByRole('button', { name: /abrir pacientes/i }).click();
  await expect(page).toHaveURL(/\/pacientes$/);
  await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page
    .getByLabel('Sessão ativa')
    .getByRole('button', { name: /agenda/i })
    .click();
  await expect(page).toHaveURL(/\/agenda$/);
  await expect(
    page.getByRole('heading', { name: 'Agenda e notificações', level: 1 }),
  ).toBeVisible();
  const openNewEventButton = page
    .locator('.agenda-tools')
    .getByRole('button', { name: 'Novo evento' });
  await expect(openNewEventButton).toBeVisible();
  await openNewEventButton.click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
});

test('mantem telas criticas sem overflow horizontal no mobile', async ({ page }) => {
  await mockApi(page);

  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 860 });

    await loginViaUi(page, '/agenda');
    await expect(
      page.getByRole('heading', { name: 'Agenda e notificações', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.agenda-calendar')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    await loginViaUi(page, '/pacientes');
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
    await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    await loginViaUi(page, '/financeiro');
    await expect(page.getByRole('heading', { name: 'Financeiro', level: 1 })).toBeVisible();
    await expect(page.locator('.billing-receipt-actions')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    await loginViaUi(page, '/faturamento-medico');
    await expect(page.getByRole('heading', { name: 'Faturamento', level: 1 })).toBeVisible();
    await expect(page.locator('.billing-flow-table')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);
  }
});
