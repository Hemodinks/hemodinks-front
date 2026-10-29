import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type Helpers = {
  mockApi: (page: Page) => Promise<unknown>;
  loginViaUi: (page: Page, path?: string) => Promise<void>;
  patient: Record<string, unknown>;
};

export function registerExportConsistencyCases(helpers: Helpers) {
  for (const width of [390, 1280]) test(`exportação #194: consulta paginada, modal, PDF/XLSX e atualização ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await helpers.mockApi(page);
    const date = new Date().toISOString();
    const patients = Array.from({ length: 101 }, (_, index) => ({ ...helpers.patient,
      id: 194000 + index, nomePaciente: `Caso ${String(index + 1).padStart(3, '0')}`,
      statusPago: true, data: date, dataAtendimento: date,
    }));
    let drift = false;
    const pages: number[] = [];
    await page.route('**/api/faturamentos-medicos/**', route => {
      const number = Number(new URL(route.request().url()).searchParams.get('page') ?? 1);
      pages.push(number);
      const items = patients.slice((number - 1) * 100, number * 100);
      if (drift && number === 2 && width === 390) items[0] = patients[99];
      return route.fulfill({ json: { items, page: number, pageSize: 100,
        totalItems: drift && number === 2 && width === 1280 ? 102 : 101, totalPages: 2 } });
    });
    await helpers.loginViaUi(page, '/relatorios');
    await expect(page.getByText('Caso 001', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.report-record-card')).toHaveCount(10);
    await page.getByRole('button', { name: 'Próxima página dos relatórios', exact: true }).click();
    await expect(page.getByText('Caso 011', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /Atendimentos com checklist incompleto/ }).click();
    const modal = page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true });
    await expect(modal).toContainText('101 atendimento(s) com checklist incompleto');
    await expect(modal).toContainText('Caso 101');
    await expect(modal).toContainText('Pagamentos pendentes: 0');
    await page.keyboard.press('Escape');
    await page.locator('summary').filter({ hasText: 'Filtros' }).click();
    for (const [label, extension] of [['Exportar Planilha', 'xlsx'], ['Exportar PDF', 'pdf']]) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()]);
      const raw = (await readFile((await download.path())!)).toString(extension === 'pdf' ? 'latin1' : 'utf8');
      const text = extension === 'pdf'
        ? [...raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(match => match[1].replace(/\\([()\\])/g, '$1')).join(' ')
        : raw.match(/<worksheet\b[\s\S]*?<\/worksheet>/)?.[0] ?? '';
      for (const patient of patients) expect(text.includes(patient.nomePaciente), `Registro ${patient.id} presente em ${extension}`).toBe(true);
      if (extension === 'xlsx') {
        for (const patient of patients) expect(text.split(patient.nomePaciente).length - 1).toBe(1);
      } else expect(raw.startsWith('%PDF-')).toBe(true);
    }
    expect(pages).toContain(2);
    drift = true;
    await page.getByRole('button', { name: 'Atualizar dados dos relatórios', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /Os dados da consulta mudaram/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Exportar Planilha', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Exportar PDF', exact: true })).toBeDisabled();
    drift = false;
    patients[0].nomePaciente = 'Caso 001 Atualizado';
    await page.getByRole('button', { name: 'Atualizar dados dos relatórios', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Exportar Planilha', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Página anterior dos relatórios', exact: true }).click();
    await expect(page.getByText('Caso 001 Atualizado', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Caso 001', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
