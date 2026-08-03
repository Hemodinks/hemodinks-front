import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  loginViaUi,
  mockApi,
  patientSession,
  toDateInputValue,
  toTimeInputValue,
} from './hemodinks.support';

test('cadastra evento na agenda', async ({ page }) => {
  const apiState = await mockApi(page);
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  await loginViaUi(page, '/agenda');
  await expect(
    page.getByRole('heading', { name: 'Agenda e notificações', level: 1 }),
  ).toBeVisible();
  await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
  await page.getByLabel('Título').fill('Evento E2E');
  await page.getByLabel('Descrição').fill('Validação automatizada da agenda');
  await page.getByLabel('Início').fill(toDateInputValue(start));
  await page.getByLabel('Hora').first().fill(toTimeInputValue(start));
  await page.getByLabel('Término').fill(toDateInputValue(end));
  await page.getByLabel('Hora').nth(1).fill(toTimeInputValue(end));
  await page.getByRole('button', { name: 'Cadastrar evento' }).click();

  await expect(page.getByText('Evento cadastrado.')).toBeVisible();
  await expect(page.getByText('Evento E2E')).toBeVisible();
  expect(apiState.createdEventPayload).toMatchObject({
    title: 'Evento E2E',
    description: 'Validação automatizada da agenda',
    notifyUser: true,
  });
});

test('exporta pacientes em XLSX e PDF', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  const xlsxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar XLSX' }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  expect(xlsxDownload.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar PDF' }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('bloqueia rota de usuarios para perfil paciente', async ({ page }) => {
  await mockApi(page, patientSession);
  await loginViaUi(page, '/usuarios', patientSession);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir usuários/i })).toHaveCount(0);
});

test('nao apresenta violacoes serias de acessibilidade nas rotas principais', async ({ page }) => {
  await mockApi(page);

  for (const route of ['/dashboard', '/usuarios', '/pacientes', '/agenda']) {
    await loginViaUi(page, route);
    await expect(page.locator('main, .app-shell, .login-shell').first()).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blockingViolations = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(
      blockingViolations,
      `${route}: ${blockingViolations.map((item) => item.id).join(', ')}`,
    ).toEqual([]);
  }
});
