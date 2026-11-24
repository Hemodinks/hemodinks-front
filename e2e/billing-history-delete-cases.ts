import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Setup = (page: Page) => Promise<unknown>;
type Login = (page: Page, path: string) => Promise<unknown>;

const file = { id: 7, ano: 2026, mes: 6, nomeOriginal: 'lote-junho.pdf', contentType: 'application/pdf', tamanhoBytes: 1024, dataUpload: '2026-07-01T12:00:00Z' };

// #311: excluir arquivo do histórico confirma no Modal do sistema, nos três tamanhos de tela.
export function registerBillingHistoryDeleteCases({ setup, login }: { setup: Setup; login: Login }) {
  for (const width of [390, 820, 1440]) {
    test(`histórico #311: excluir arquivo confirma no modal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await setup(page);
      const deleted: string[] = [];
      let files = [file];
      await page.route('**/api/faturamentos-medicos/historico/arquivos', route => route.request().method() === 'GET'
        ? route.fulfill({ json: files }) : route.fallback());
      await page.route('**/api/faturamentos-medicos/historico/arquivos/7', async route => {
        if (route.request().method() !== 'DELETE') return route.fallback();
        deleted.push(route.request().url());
        files = [];
        await route.fulfill({ status: 204 });
      });
      await login(page, '/historico-faturamento');

      const june = page.getByRole('button', { name: /^Junho 1 atendimento/i });
      await june.click();
      const remove = page.getByRole('button', { name: 'Excluir lote-junho.pdf' });
      await remove.click();

      const dialog = page.getByRole('dialog', { name: 'Excluir arquivo?' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);

      await dialog.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialog).toBeHidden();
      await expect(remove).toBeFocused();
      expect(deleted).toEqual([]);

      await remove.click();
      await dialog.getByRole('button', { name: 'Excluir' }).click();
      await expect(page.getByText('Arquivo excluído com sucesso.')).toBeVisible();
      expect(deleted).toHaveLength(1);
      await expect(page.getByText('lote-junho.pdf')).toHaveCount(0);
    });
  }
}
