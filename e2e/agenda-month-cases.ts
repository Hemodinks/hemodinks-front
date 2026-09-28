import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Helpers = { mockApi: (page: Page) => Promise<unknown>; loginViaUi: (page: Page, path?: string) => Promise<void> };
export function registerAgendaMonthCases({ mockApi, loginViaUi }: Helpers) {
  test('agenda mensal: previews, seleção, excedentes e uma consulta por intervalo', async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.setFixedTime(new Date(2026, 8, 26, 12));
    await mockApi(page);
    const events = Array.from({ length: 300 }, (_, i) => {
      const date = new Date(2026, 8, i < 4 ? 26 : 1 + i % 25, i < 4 ? 9 + i : 8, 0);
      if (i === 299) date.setMonth(7, 30);
      return { id: i + 1, userId: 1, title: `Compromisso ${i + 1}`, start: date.toISOString(),
        end: new Date(date.getTime() + 3600000).toISOString(), notifyUser: true, isCompleted: false };
    });
    const queries: string[] = [];
    await page.route('**/api/events/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/events/' || route.request().method() !== 'GET') return route.fallback();
      queries.push(url.search);
      const from = Date.parse(url.searchParams.get('from')!); const to = Date.parse(url.searchParams.get('to')!);
      return route.fulfill({ json: events.filter(event => Date.parse(event.end) >= from && Date.parse(event.start) <= to) });
    });
    const started = Date.now();
    await loginViaUi(page, '/agenda');
    const cell = page.locator('.agenda-day[data-date="2026-09-26"]');
    await expect(cell.locator('.agenda-event-preview')).toHaveCount(2);
    await expect(cell).toHaveClass(/today/); await expect(cell).toHaveClass(/selected/); await expect(cell).toHaveClass(/has-events/);
    await expect(cell.getByRole('button', { name: 'sábado, 26 de setembro de 2026', exact: true })).toHaveAttribute('aria-current', 'date');
    await expect(page.locator('.agenda-day[data-date="2026-08-30"]')).toHaveClass(/muted/);
    await expect(page.locator('.agenda-day[data-date="2026-10-10"]')).toHaveClass(/muted/);
    expect(queries).toHaveLength(1);
    const loginAndRenderMs = Date.now() - started;
    await cell.getByRole('button', { name: '+2 eventos', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Eventos da data selecionada' })).toBeFocused();
    await expect(page.locator('.agenda-event-list article')).toHaveCount(4);
    await cell.getByRole('button', { name: '09:00 Compromisso 1', exact: true }).click();
    await expect(page.locator('#agenda-event-1')).toBeFocused();
    expect(queries).toHaveLength(1);
    await page.locator('.agenda-day[data-date="2026-09-27"] .agenda-day-select').click();
    await expect(page.getByText('Nenhum evento nesta data.', { exact: true })).toBeVisible();
    expect(queries).toHaveLength(1);
    await page.getByRole('button', { name: 'Proximo mes', exact: true }).click();
    await expect(page.locator('.agenda-monthbar')).toContainText('outubro');
    await expect(page.locator('.agenda-calendar')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.agenda-event-preview')).toHaveCount(0);
    expect(queries).toHaveLength(2);
    await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
    await expect(cell.locator('.agenda-event-preview')).toHaveCount(2);
    expect(queries).toHaveLength(3);
    const audit = await new AxeBuilder({ page }).include('.agenda-calendar').analyze();
    expect(audit.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    await page.locator('.agenda-day[data-date="2026-08-30"] .agenda-event-preview').click();
    await expect(page.locator('.agenda-monthbar')).toContainText('agosto');
    await expect(page.locator('#agenda-event-300')).toBeFocused();
    expect(queries).toHaveLength(4);
    const metrics = JSON.stringify({ fixtureEvents: events.length,
      fixturePayloadBytes: Buffer.byteLength(JSON.stringify(events)), loginAndRenderMs, queries,
      note: 'Synthetic browser fixture; not a production API latency benchmark.' });
    await writeFile(info.outputPath('month-metrics.json'), metrics);
    await info.attach('month-request-metrics', { body: metrics, contentType: 'application/json' });
    await page.screenshot({ path: info.outputPath('agenda-month.png'), fullPage: true });
  });
}
