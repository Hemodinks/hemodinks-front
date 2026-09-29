import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Helpers = {
  mockApi: (page: Page) => Promise<{ createdEventPayload: unknown }>;
  loginViaUi: (page: Page, path?: string) => Promise<void>;
};
export function registerAgendaResponsiveCases({ mockApi, loginViaUi }: Helpers) {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 820, height: 1180 }, { name: 'mobile', width: 390, height: 844 }, { name: 'mobile-compact', width: 320, height: 740 }]) {
    test(`agenda responsiva: cadastro completo em ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const api = await mockApi(page);
      await loginViaUi(page, '/agenda');
      const date = new Date(); date.setDate(date.getDate() + 1);
      const pad = (value: number) => String(value).padStart(2, '0');
      const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      if (viewport.width <= 520) {
        await expect(page.locator('.agenda-calendar')).toBeHidden();
        await page.getByLabel('Data da agenda').fill(key);
        await page.getByRole('button', { name: 'Próximo dia', exact: true }).click();
        await page.getByRole('button', { name: 'Dia anterior', exact: true }).click();
        await expect(page.getByLabel('Data da agenda')).toHaveValue(key);
      } else {
        await expect(page.locator('.agenda-calendar')).toBeVisible();
        await page.getByRole('button', { name: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date), exact: true }).click();
      }
      await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
      await expect(page.getByLabel('Início', { exact: true })).toHaveValue(key);
      for (const name of ['Informações do evento', 'Data e horário', 'Notificações e lembretes', 'Destinatários'])
        await expect(page.getByRole('group', { name, exact: true })).toBeVisible();
      await page.getByLabel('Título', { exact: true }).fill(`Evento ${viewport.name}`);
      await page.getByLabel('Descrição', { exact: true }).fill('Cadastro responsivo com destinatários');
      await page.getByLabel('Hora', { exact: true }).first().fill('09:00');
      await expect(page.getByLabel('Hora', { exact: true }).nth(1)).toHaveValue('10:00');
      await page.getByLabel('Mensagem da notificação').fill('Reunião da clínica selecionada');
      await page.locator('.agenda-recipient-list input[type="checkbox"]').first().check();
      const bounds = await page.getByLabel('Início', { exact: true }).boundingBox();
      const timeBounds = await page.getByLabel('Hora', { exact: true }).first().boundingBox();
      if (viewport.width <= 760) expect(timeBounds!.y).toBeGreaterThan(bounds!.y + bounds!.height);
      else expect(Math.abs(timeBounds!.y - bounds!.y)).toBeLessThan(3);
      await page.screenshot({ path: testInfo.outputPath(`agenda-form-${viewport.name}.png`), fullPage: true });
      const overflow = await page.evaluate(() => ({
        width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('body *')]
          .filter(element => element.getBoundingClientRect().right > window.innerWidth)
          .map(element => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })),
      }));
      expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
      const audit = await new AxeBuilder({ page }).include('.agenda-form').analyze();
      expect(audit.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
      await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
      await expect(page.getByText('Evento cadastrado.', { exact: true })).toBeVisible();
      await expect(page.locator('.agenda-event-list').getByText(`Evento ${viewport.name}`, { exact: true })).toBeVisible();
      await expect(page.locator('.agenda-form')).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`agenda-saved-${viewport.name}.png`), fullPage: true });
      expect(api.createdEventPayload).toMatchObject({ title: `Evento ${viewport.name}`, notificationMessage: 'Reunião da clínica selecionada' });
      if (viewport.width <= 520) await expect(page.getByLabel('Data da agenda')).toHaveValue(key);
      else await expect(page.locator('.agenda-day.selected')).toHaveAttribute('aria-label', new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
  test('agenda preserva formulário após falha e permite cancelar', async ({ page }) => {
    await mockApi(page);
    await loginViaUi(page, '/agenda');
    await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
    await page.getByLabel('Título', { exact: true }).fill('Não perder dados');
    await page.route('**/api/events/', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 400, json: { message: 'Não foi possível salvar o evento. Tente novamente.' } }) : route.fallback());
    await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
    await expect(page.getByText('Não foi possível salvar o evento. Tente novamente.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Não perder dados');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.locator('.agenda-form')).toHaveCount(0);
    await expect(page.locator('.agenda-selected')).toBeVisible();
  });
}
