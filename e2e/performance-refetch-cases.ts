import { expect, test, type Page } from '@playwright/test';

type Dependencies = { setup: (page: Page) => Promise<unknown>; login: (page: Page, route: string) => Promise<void> };

export function registerPerformanceRefetchCases({ setup, login }: Dependencies) {
  for (const width of [390, 1440]) {
    for (const scenario of [
      { route: '/usuarios', api: '/api/users/', name: 'Ana Hemodinks', refresh: 'Atualizar lista de usuários', deleted: 'Usuário excluído.' },
      { route: '/pacientes', api: '/api/pacientes/', name: 'Paciente Hemodinks', refresh: 'Atualizar lista de pacientes', deleted: 'Paciente excluído.' },
    ]) {
      test(`performance: refresh e exclusão sem requests duplicados em ${scenario.route} (${width}px)`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await setup(page);
        let listReads = 0;
        let summaryReads = 0;
        page.on('request', request => {
          if (request.method() !== 'GET') return;
          const path = new URL(request.url()).pathname;
          if (path === scenario.api) listReads++;
          if (path === '/api/dashboard/summary') summaryReads++;
        });
        await login(page, scenario.route);
        const row = page.getByRole('row').filter({ hasText: scenario.name });
        await expect(row).toBeVisible();
        const beforeRefresh = listReads;
        await page.getByRole('button', { name: scenario.refresh, exact: true }).click();
        await expect(row).toBeVisible();
        await expect.poll(() => listReads).toBe(beforeRefresh + 1);
        const beforeDelete = listReads;
        const beforeSummary = summaryReads;
        await row.getByRole('button', { name: /excluir/i }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Sim', exact: true }).click();
        await expect(page.getByText(scenario.deleted, { exact: true })).toBeVisible();
        await expect(row).toHaveCount(0);
        await expect.poll(() => listReads).toBe(beforeDelete + 1);
        await expect.poll(() => summaryReads).toBe(beforeSummary + 1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      });
    }
  }
}
