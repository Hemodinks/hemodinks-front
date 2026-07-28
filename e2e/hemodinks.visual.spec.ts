import { expect, test } from '@playwright/test';
import {
  captureCurrentScreenshot,
  captureRouteScreenshot,
  financeAccount,
  loginViaUi,
  mockApi,
  negotiatedPrice,
} from './hemodinks.support';

test('mantem popups financeiros dentro da viewport e acoes compactas com tooltip', async ({
  page,
}, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 800 });

  await loginViaUi(page, '/financeiro');

  const receiptFileAction = page.locator('.billing-receipt-upload .file-action');
  await expect(receiptFileAction).toBeVisible();
  const receiptFormatWidth = await page
    .locator('.billing-receipt-format')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(receiptFormatWidth).toBeLessThanOrEqual(132);
  const receiptFileLayout = await receiptFileAction.evaluate((element) => {
    const text = element.querySelector('.billing-receipt-file-name');
    const buttonBounds = element.getBoundingClientRect();
    const textBounds = text?.getBoundingClientRect();

    return {
      buttonLeft: buttonBounds.left,
      buttonRight: buttonBounds.right,
      textLeft: textBounds?.left ?? 0,
      textRight: textBounds?.right ?? 0,
      textOverflow: text ? getComputedStyle(text).textOverflow : '',
    };
  });
  expect(receiptFileLayout.textLeft).toBeGreaterThanOrEqual(receiptFileLayout.buttonLeft);
  expect(receiptFileLayout.textRight).toBeLessThanOrEqual(receiptFileLayout.buttonRight);
  expect(receiptFileLayout.textOverflow).toBe('ellipsis');

  const financeTutorial = page.getByRole('complementary', {
    name: 'Tutorial do módulo Financeiro',
  });
  await expect(financeTutorial.locator('.tutorial-section.is-open')).toBeVisible();
  const moduleColors = await page.evaluate(() => {
    const tutorial = document.querySelector('[data-tutorial-view="finance"]') as HTMLElement | null;
    const activeMenu = document.querySelector('.side-nav-billing.active') as HTMLElement | null;

    return {
      tutorial: tutorial
        ? getComputedStyle(tutorial).getPropertyValue('--tutorial-module-color').trim()
        : '',
      menu: activeMenu
        ? getComputedStyle(activeMenu).getPropertyValue('--side-nav-color').trim()
        : '',
    };
  });
  expect(moduleColors.tutorial).toBe(moduleColors.menu);
  await page.screenshot({
    path: testInfo.outputPath('financeiro-formulario-ajuda.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: financeAccount.numeroDocumento }).click();

  const accountDialog = page.getByRole('dialog', {
    name: financeAccount.numeroDocumento,
  });
  await expect(accountDialog).toBeVisible();

  const dialogBox = await accountDialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.width).toBeLessThanOrEqual(1042);
  expect(dialogBox!.x).toBeGreaterThanOrEqual(30);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(1250);
  await page.screenshot({
    path: testInfo.outputPath('financeiro-popup-largura.png'),
    fullPage: true,
  });

  const closeAccount = page.getByRole('button', {
    name: 'Fechar detalhes da conta',
  });
  await closeAccount.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Fechar detalhes da conta');
  await closeAccount.click();

  await loginViaUi(page, '/tabela-de-precos');
  const priceActions = page.locator('.billing-status-actions-column').last();
  await expect(priceActions.getByRole('button', { name: 'Editar preço' })).toBeVisible();
  await expect(
    priceActions.getByRole('button', {
      name: `Desativar preço ${negotiatedPrice.cbhpmCodigo}`,
    }),
  ).toBeVisible();
  await expect(priceActions.locator('.ghost-button')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('tabela-precos-acoes-compactas.png'),
    fullPage: true,
  });

  await loginViaUi(page, '/faturamento-medico');
  const billingFlowWrap = page.locator('.billing-flow-table').locator('..');
  const billingFlowDimensions = await billingFlowWrap.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(billingFlowDimensions.scrollWidth).toBeGreaterThan(billingFlowDimensions.clientWidth);
  const billingActions = page.locator('tbody .billing-actions-column');
  await expect(
    billingActions.first().getByRole('button', { name: 'Registrar retorno' }),
  ).toBeVisible();
  await expect(billingActions.locator('.ghost-button')).toHaveCount(0);

  const returnAction = billingActions.first().getByRole('button', { name: 'Registrar retorno' });
  await returnAction.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Registrar retorno');
  await page.screenshot({
    path: testInfo.outputPath('faturamento-acoes-compactas.png'),
    fullPage: true,
  });
});

test('gera evidencias visuais desktop e mobile das telas principais', async ({
  page,
}, testInfo) => {
  await mockApi(page);

  for (const width of [390, 1440]) {
    await captureRouteScreenshot(page, testInfo, '/dashboard', width);
    await captureRouteScreenshot(page, testInfo, '/usuarios', width);
    await captureRouteScreenshot(page, testInfo, '/pacientes', width);
    await captureRouteScreenshot(page, testInfo, '/agenda', width);
    await captureRouteScreenshot(page, testInfo, '/financeiro', width);
    await captureRouteScreenshot(page, testInfo, '/faturamento-medico', width);

    await loginViaUi(page, '/usuarios');
    await page.getByRole('button', { name: 'Novo usuário' }).click();
    await expect(page.getByRole('heading', { name: 'Novo usuário' })).toBeVisible();
    await captureCurrentScreenshot(page, testInfo, 'usuarios-formulario', width);

    await loginViaUi(page, '/pacientes');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await expect(page.getByRole('heading', { name: 'Novo paciente' })).toBeVisible();
    await captureCurrentScreenshot(page, testInfo, 'pacientes-formulario', width);
  }
});
