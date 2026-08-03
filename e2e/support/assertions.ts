import { expect, type Page, type TestInfo } from '@playwright/test';
import { loginViaUi } from './mockApi';

export async function expectNoGlobalHorizontalOverflow(page: Page) {
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).resolves.toBe(true);
}

export async function expectTableRowVisible(
  page: Page,
  tableSelector: string,
  rowText: string,
  loadingText: string,
) {
  await expect(page.getByText(loadingText)).toHaveCount(0);
  await expect(
    page.locator(`${tableSelector} tbody tr`, { hasText: rowText }).first(),
  ).toBeVisible();
}

export async function captureRouteScreenshot(
  page: Page,
  testInfo: TestInfo,
  route: string,
  width: number,
) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await loginViaUi(page, route);
  if (route === '/financeiro') {
    await expect(page.locator('.billing-finance-receipt-panel')).toBeVisible();
  }
  if (route === '/faturamento-medico') {
    await expect(page.locator('.billing-flow-table')).toBeVisible();
  }
  await expect(page.getByText('Carregando módulo...')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath(`${route.replace('/', '') || 'home'}-${width}.png`),
    fullPage: true,
  });
  await expectNoGlobalHorizontalOverflow(page);
}

export async function captureCurrentScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  width: number,
) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
  await expectNoGlobalHorizontalOverflow(page);
}
