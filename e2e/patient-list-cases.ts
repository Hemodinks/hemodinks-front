import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPatientFormApi } from './patient-form-api';

type Dependencies = {
  setup: (page: Page) => Promise<{ pacientes: Record<string, any>[] }>;
  login: (page: Page, route?: string) => Promise<void>;
};

export function registerPatientListTests({ setup, login }: Dependencies) {
  test.describe('listagem paciente', () => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      test(`ações, cores, acessibilidade e responsividade em ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const base = await setup(page);
        const api = await mockPatientFormApi(page, base.pacientes[0]);
        api.patients.push({ ...api.patients[0], id: 22, nomePaciente: 'Paciente Com Nome Muito Longo Para Validar Quebra De Linha' });
        await login(page, '/pacientes');
        const panel = page.locator('.patient-list-panel');
        await expect(panel.locator('tbody tr')).toHaveCount(2);
        await expect(panel.locator('.patient-filters-accordion')).not.toHaveAttribute('open', '');
        await panel.locator('.patient-filters-accordion > summary').click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const overflow = await panel.locator('button, input:not(.sr-only), select').evaluateAll((elements) => elements.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
        }).map((el) => el.outerHTML));
        expect(overflow).toEqual([]);
        const row = panel.locator('tbody tr').first();
        const actionCell = row.locator('td').nth(1);
        await expect(actionCell.getByTitle('Editar')).toBeVisible();
        await expect(actionCell.getByTitle('Excluir', { exact: true })).toBeVisible();
        const bounds = await actionCell.getByTitle('Editar').boundingBox();
        expect(bounds!.width).toBeGreaterThanOrEqual(44);
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        await panel.getByRole('button', { name: 'Exportar PDF', exact: true }).focus();
        await expect(panel.getByRole('button', { name: 'Exportar PDF', exact: true })).toBeFocused();
        await expect(panel.locator('.export-pdf-btn')).toHaveCSS('border-top-color', 'rgb(91, 33, 182)');
        await expect(panel.locator('.export-xlsx-btn')).toHaveCSS('border-top-color', 'rgb(22, 101, 52)');
        if (width === 390 || width === 1440) {
          for (const theme of ['light', 'dark']) {
            await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
            expect((await new AxeBuilder({ page }).include('.patient-list-panel').analyze()).violations).toEqual([]);
            await page.screenshot({ path: testInfo.outputPath(`listagem-${width}-${theme}.png`), fullPage: true });
          }
        }
        await actionCell.getByTitle('Editar').click();
        await expect(page.getByRole('heading', { name: 'Editar paciente' })).toBeVisible();
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await expect(panel).toBeVisible();
      });
    }

    test('combina busca e filtro, limpa, pagina e trata resultado vazio', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0]);
      for (let i = 0; i < 12; i++) api.patients.push({ ...api.patients[0], id: 100 + i, nomePaciente: `Outro ${i}`, procedimento: 'Cirurgia' });
      await login(page, '/pacientes');
      await expect(page.locator('.patients-table tbody tr')).toHaveCount(10);
      await page.getByRole('button', { name: 'Próxima página de pacientes' }).click();
      await expect(page.getByText('Página 2 de 2', { exact: true })).toBeVisible();
      await expect(page.locator('.patients-table tbody tr')).toHaveCount(3);
      await page.getByLabel('Buscar pacientes', { exact: true }).fill('Hemodinks');
      await page.locator('.patient-filters-accordion > summary').click();
      await page.getByLabel('Procedimento', { exact: true }).fill('Consulta');
      await expect(page.locator('.patients-table tbody tr')).toHaveCount(1);
      await expect.poll(() => api.queries.some((q) => q.get('search') === 'Hemodinks' && q.get('procedimento') === 'Consulta' && q.get('page') === '1')).toBe(true);
      await page.getByLabel('Procedimento', { exact: true }).fill('Inexistente');
      await expect(page.getByText('Nenhum paciente encontrado.', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Limpar filtros' }).click();
      await page.getByLabel('Buscar pacientes', { exact: true }).fill('');
      await expect(page.getByLabel('Procedimento', { exact: true })).toHaveValue('');
      await expect(page.locator('.patients-table tbody tr')).toHaveCount(10);
    });

    test('bloqueia confirmação durante exclusão e preserva paciente quando a API falha', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0]);
      api.failDelete = true;
      api.deleteDelay = 1000;
      await login(page, '/pacientes');
      await page.getByRole('button', { name: 'Excluir Paciente Hemodinks', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
      await expect(dialog.getByRole('button', { name: 'Aguarde...' })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Não', exact: true })).toBeDisabled();
      await expect(page.getByRole('alert')).toHaveText('Não foi possível excluir o paciente de teste.');
      expect(api.deleteRequests).toBe(1);
      await expect(page.getByRole('button', { name: 'Excluir Paciente Hemodinks', exact: true })).toBeVisible();
    });
  });
}
