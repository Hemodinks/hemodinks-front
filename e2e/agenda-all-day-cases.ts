import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Helpers = { mockApi: (page: Page) => Promise<unknown>; loginViaUi: (page: Page, path?: string) => Promise<void> };
export function registerAgendaAllDayCases({ mockApi, loginViaUi }: Helpers) {
  for (const width of [1440, 390]) test(`agenda dia inteiro: datas, edição, visões e lembretes em ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date(2026, 8, 26, 12));
    await mockApi(page);
    let saved: Record<string, unknown> | null = null;
    const payloads: Record<string, unknown>[] = [];
    await page.route('**/api/events/**', async route => {
      const url = new URL(route.request().url()); const method = route.request().method();
      if (url.pathname === '/api/events/' && method === 'GET') return route.fulfill({ json: saved ? [saved] : [] });
      if ((url.pathname === '/api/events/' && method === 'POST') || (url.pathname === '/api/events/501' && method === 'PUT')) {
        const payload = route.request().postDataJSON(); payloads.push(payload);
        const projection = await page.evaluate(({ first, last }) => {
          const start = new Date(`${first}T00:00:00`); const end = new Date(`${last}T00:00:00`); end.setDate(end.getDate() + 1);
          return { start: start.toISOString(), end: end.toISOString() };
        }, { first: payload.allDayStartDate, last: payload.allDayEndDate });
        saved = { ...payload, ...projection, id: 501, userId: 99, userName: 'George', isCompleted: false };
        return route.fulfill({ json: saved });
      }
      return route.fallback();
    });
    await loginViaUi(page, '/agenda');
    await page.getByRole('button', { name: 'Novo evento', exact: true }).first().click();
    await page.getByLabel('Título', { exact: true }).fill('Encontro de dia inteiro');
    await page.getByLabel('Início', { exact: true }).fill('2026-09-26');
    await page.getByLabel('Término', { exact: true }).fill('2026-09-26');
    await page.getByRole('checkbox', { name: 'Evento de dia inteiro', exact: true }).check();
    await expect(page.getByLabel('Hora', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Início', { exact: true })).toHaveValue('2026-09-26');
    await expect(page.getByLabel('Término', { exact: true })).toHaveValue('2026-09-26');
    await expect(page.getByText(/antecedência continua sendo de 48 horas/)).toBeVisible();
    const audit = await new AxeBuilder({ page }).include('.agenda-form').analyze();
    expect(audit.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
    await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
    const selected = page.getByRole('region', { name: 'Eventos da data selecionada' });
    await expect(selected).toContainText('Dia inteiro · 26/09/2026');
    expect(payloads[0]).toMatchObject({ isAllDay: true, allDayStartDate: '2026-09-26', allDayEndDate: '2026-09-26', notifyUser: true });
    expect(payloads[0]).not.toHaveProperty('start'); expect(payloads[0]).not.toHaveProperty('end');
    const zone = payloads[0].timeZoneId;
    await selected.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Evento de dia inteiro' })).toBeChecked();
    await expect(page.getByLabel('Início', { exact: true })).toHaveValue('2026-09-26');
    await page.getByLabel('Término', { exact: true }).fill('2026-09-28');
    await page.getByRole('button', { name: 'Salvar evento', exact: true }).click();
    await expect(selected).toContainText('Dia inteiro · 26/09/2026 a 28/09/2026');
    expect(payloads[1]).toMatchObject({ allDayEndDate: '2026-09-28', timeZoneId: zone });
    if (width > 520) {
      for (const day of ['26', '27', '28']) await expect(page.locator(`.agenda-day[data-date="2026-09-${day}"]`)).toContainText('Dia inteiro');
      await expect(page.locator('.agenda-day[data-date="2026-09-25"] .agenda-event-preview')).toHaveCount(0);
      await expect(page.locator('.agenda-day[data-date="2026-09-29"] .agenda-event-preview')).toHaveCount(0);
    }
    const modes = page.getByRole('group', { name: 'Visualização da agenda' });
    await modes.getByRole('button', { name: 'Semana', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Agenda da semana', exact: true }).getByRole('article')).toHaveCount(2);
    await modes.getByRole('button', { name: 'Lista', exact: true }).click();
    const list = page.getByRole('region', { name: 'Agenda em lista', exact: true });
    await expect(list.getByRole('article')).toHaveCount(1); await expect(list).toContainText('Dia inteiro');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('agenda-all-day.png'), fullPage: true });
  });
}
