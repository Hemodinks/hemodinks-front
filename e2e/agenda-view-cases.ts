import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Helpers = { mockApi: (page: Page) => Promise<unknown>; loginViaUi: (page: Page, path?: string) => Promise<void> };
export function registerAgendaViewCases({ mockApi, loginViaUi }: Helpers) {
  for (const width of [1440, 390]) test(`agenda visualizações: mês, semana, lista e filtros em ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date(2026, 8, 26, 12));
    await mockApi(page);
    const events = [
      { id: 1, day: 26, title: 'Reunião clínica', userId: 99, isCompleted: false },
      { id: 2, day: 27, title: 'Auditoria encerrada', userId: 2, isCompleted: true },
      { id: 3, day: 28, title: 'Conferência', userId: 99, isCompleted: false },
    ].map(item => ({ ...item, userName: 'Responsável local', description: 'Equipe da clínica',
      start: new Date(2026, 8, item.day, 9).toISOString(), end: new Date(2026, 8, item.day, 10).toISOString(), notifyUser: true }));
    const queries: URL[] = [];
    await page.route('**/api/events/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/events/' || route.request().method() !== 'GET') return route.fallback();
      queries.push(url);
      const search = url.searchParams.get('search')?.toLocaleLowerCase();
      return route.fulfill({ json: events.filter(event => Date.parse(event.end) >= Date.parse(url.searchParams.get('from')!)
        && Date.parse(event.start) <= Date.parse(url.searchParams.get('to')!)
        && (!search || `${event.title} ${event.description}`.toLocaleLowerCase().includes(search))
        && (!url.searchParams.has('userId') || event.userId === Number(url.searchParams.get('userId')))
        && (!url.searchParams.has('isCompleted') || String(event.isCompleted) === url.searchParams.get('isCompleted'))) });
    });
    await loginViaUi(page, '/agenda');
    const modes = page.getByRole('group', { name: 'Visualização da agenda' });
    await expect(modes.getByRole('button', { name: 'Mês', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Eventos da data selecionada' })).toContainText('Reunião clínica');
    expect(queries).toHaveLength(1);
    await modes.getByRole('button', { name: 'Semana', exact: true }).click();
    const week = page.getByRole('region', { name: 'Agenda da semana', exact: true });
    await expect(week.getByRole('article')).toHaveCount(2);
    await expect(week).toContainText('09:00 - 10:00');
    await page.screenshot({ path: info.outputPath('agenda-week.png'), fullPage: true });
    await modes.getByRole('button', { name: 'Lista', exact: true }).click();
    const list = page.getByRole('region', { name: 'Agenda em lista' });
    await expect(list.getByRole('article')).toHaveCount(3);
    await expect(list.getByRole('heading', { name: 'Hoje', exact: true })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Amanhã', exact: true })).toBeVisible();
    await expect(list.getByRole('heading', { name: 'Próximos dias', exact: true })).toBeVisible();
    expect(queries).toHaveLength(1);
    await page.screenshot({ path: info.outputPath('agenda-list.png'), fullPage: true });
    await page.getByLabel('Buscar evento', { exact: true }).fill('Reunião');
    await expect(list.getByRole('article')).toHaveCount(1);
    expect(queries.at(-1)!.searchParams.get('search')).toBe('Reunião');
    await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('completed');
    await expect(list).toContainText('Nenhum evento neste período.');
    await page.getByLabel('Buscar evento', { exact: true }).fill('');
    await expect(list.getByRole('article')).toHaveCount(1);
    await expect(list).toContainText('Auditoria encerrada');
    await page.getByRole('combobox', { name: 'Situação', exact: true }).selectOption('all');
    await expect(list.getByRole('article')).toHaveCount(3);
    await page.getByRole('combobox', { name: 'Responsável', exact: true }).selectOption('mine');
    await expect(list.getByRole('article')).toHaveCount(2);
    expect(queries.at(-1)!.searchParams.get('userId')).toBe('99');
    await page.getByRole('combobox', { name: 'Responsável', exact: true }).selectOption('all');
    await expect(list.getByRole('article')).toHaveCount(3);
    await modes.getByRole('button', { name: 'Mês', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Eventos da data selecionada' })).toContainText('Reunião clínica');
    const beforeWeek = queries.length;
    await modes.getByRole('button', { name: 'Semana', exact: true }).click();
    await expect(week.getByRole('article')).toHaveCount(2);
    await page.getByRole('button', { name: 'Próxima semana', exact: true }).click();
    await expect(week.getByRole('article')).toHaveCount(1);
    expect(queries).toHaveLength(beforeWeek);
    await page.getByRole('button', { name: 'Próxima semana', exact: true }).click();
    await expect(week.getByRole('article')).toHaveCount(0);
    await expect(week).toHaveAttribute('aria-busy', 'false');
    expect(queries).toHaveLength(beforeWeek + 1);
    await modes.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(list).toContainText('Nenhum evento neste período.');
    await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
    await expect(list.getByRole('article')).toHaveCount(3);
    await list.getByRole('button', { name: 'domingo, 27 de setembro', exact: true }).click();
    await page.getByRole('button', { name: 'Novo evento', exact: true }).click();
    await expect(page.getByLabel('Início', { exact: true })).toHaveValue('2026-09-27');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(list).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).include('.agenda-workspace').analyze();
    expect(audit.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
  });
}
