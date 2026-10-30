import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { registerExportConsistencyCases } from './export-consistency-cases';

type Helpers = {
  mockApi: (page: Page) => Promise<unknown>;
  loginViaUi: (page: Page, path?: string) => Promise<void>;
  mockMedical: (page: Page) => Promise<unknown>;
  loginMedical: (page: Page, path: string) => Promise<void>;
  patient: Record<string, unknown>;
};

async function mockRecords(page: Page, helpers: Helpers, medical = false) {
  await (medical ? helpers.mockMedical(page) : helpers.mockApi(page));
  const date = new Date().toISOString();
  const records = [
    { ...helpers.patient, id: 171, nomePaciente: 'Paciente Checklist Pago', medicoUserId: 1, medico: 'Ana Hemodinks', pagamento: '150,00', statusPago: true, data: date, dataAtendimento: date },
    { ...helpers.patient, id: 172, nomePaciente: 'Paciente Outro Atendimento', medicoUserId: 2, medico: 'Outro Médico', pagamento: '250,00', statusPago: false, data: date, dataAtendimento: date },
  ];
  await page.route('**/api/faturamentos-medicos/**', route => route.fulfill({ json: { items: records, page: 1, pageSize: 100, totalItems: records.length, totalPages: 1 } }));
}

export function registerReportChecklistCases(helpers: Helpers) {
  registerExportConsistencyCases(helpers);
  for (const path of ['/relatorios', '/faturamento-medico']) for (const width of [390, 768, 1280]) for (const theme of ['light', 'dark']) {
    test(`checklist #171: motivos acessíveis em ${path} ${width}px ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(value => localStorage.setItem('hemodinks.theme', value), theme);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await mockRecords(page, helpers);
      await helpers.loginViaUi(page, path);
      const trigger = page.getByRole('button', { name: /^Itens pendentes do checklist de Paciente Checklist Pago: \d+$/ });
      await expect(trigger).toBeVisible();
      const count = Number((await trigger.getAttribute('aria-label'))!.match(/: (\d+)$/)![1]);
      expect(count).toBeGreaterThan(0);
      await trigger.focus();
      await page.keyboard.press('Enter');
      const modal = page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true });
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Pagamentos pendentes: 0', { exact: false })).toBeVisible();
      await expect(modal.locator('.billing-checklist-row')).toHaveCount(count);
      await expect(modal.getByText('Líquido estimado a partir de pagamento menos glosa.', { exact: true })).toBeVisible();
      await expect(modal.getByText('Código TUSS/CBHPM/AMB', { exact: true })).toHaveCount(0);
      await expect(modal.getByText('Paciente Outro Atendimento', { exact: true })).toHaveCount(0);
      const box = await modal.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(900);
      const close = modal.getByRole('button', { name: 'Fechar itens pendentes do checklist' });
      await expect(close).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath('checklist-individual.png') });
      await page.keyboard.press('Shift+Tab');
      await expect(close).toBeFocused();
      const audit = await new AxeBuilder({ page }).include('.billing-pending-modal').analyze();
      expect(audit.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(modal).toHaveCount(0);
      await expect(trigger).toBeFocused();

      await page.getByRole('button', { name: /Atendimentos com checklist incompleto/ }).click();
      await expect(modal).toContainText('2 atendimento(s) com checklist incompleto no filtro atual.');
      const paidSummary = modal.locator('summary').filter({ hasText: 'Paciente Checklist Pago · #171' });
      const otherSummary = modal.locator('summary').filter({ hasText: 'Paciente Outro Atendimento · #172' });
      await expect(close).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(paidSummary).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(modal.getByText('Líquido estimado a partir de pagamento menos glosa.', { exact: true }).first()).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(otherSummary).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(otherSummary).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath('checklist-global.png') });
      await page.keyboard.press('Escape');
      const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .filter((element) => { const rect = element.getBoundingClientRect(); return rect.width && rect.right > innerWidth + 1; })
        .map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('checklist #171: consulta aplica o filtro e modal global usa o mesmo conjunto', async ({ page }) => {
    await mockRecords(page, helpers);
    await helpers.loginViaUi(page, '/relatorios');
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Outro Atendimento/ })).toBeVisible();
    await page.locator('.billing-filters-summary').click();
    await page.getByRole('checkbox', { name: 'Mostrar apenas atendimentos com checklist incompleto', exact: true }).check();
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('paid');
    // Alterar o rascunho não deve modificar os resultados antes de Consultar.
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Outro Atendimento/ })).toBeVisible();
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(page.getByText('1 atendimento(s) encontrados', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Outro Atendimento/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Atendimentos com checklist incompleto/ }).click();
    const modal = page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true });
    await expect(modal.locator('summary')).toHaveCount(1);
    await expect(modal).toContainText('Paciente Checklist Pago');
    await expect(modal).not.toContainText('Paciente Outro Atendimento');
  });

  test('checklist #171: perfil médico mantém escopo nos motivos individuais e globais', async ({ page }) => {
    await mockRecords(page, helpers, true);
    await helpers.loginMedical(page, '/relatorios');
    await expect(page).toHaveURL(/\/dashboard$/);
    const menu = page.getByLabel('Menu da clínica');
    await menu.getByRole('button', { name: 'Faturamento', exact: true }).click();
    await menu.getByRole('button', { name: 'Relatórios', exact: true }).click();
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Checklist Pago/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Outro Atendimento/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Atendimentos com checklist incompleto/ }).click();
    const modal = page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true });
    await expect(modal.locator('summary')).toHaveCount(1);
    await expect(modal).not.toContainText('Paciente Outro Atendimento');
  });

  test('checklist #171: restauração em outra clínica descarta modal e dados anteriores', async ({ page }) => {
    await mockRecords(page, helpers);
    const authenticated = page.waitForResponse(response => new URL(response.url()).pathname === '/api/users/authenticate');
    await helpers.loginViaUi(page, '/relatorios');
    const current = await (await authenticated).json();
    await page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Checklist Pago/ }).click();
    await expect(page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true })).toBeVisible();
    const claims = JSON.parse(Buffer.from(current.token.split('.')[1], 'base64url').toString());
    const betaToken = `test.${Buffer.from(JSON.stringify({ ...claims, clinicaId: 2, clinicaSlug: 'beta' })).toString('base64url')}.signature`;
    await page.route('**/api/session/restaurar', route => route.fulfill({ json: { ...current, clinicaId: 2, clinicaSlug: 'beta', token: betaToken } }));
    await page.route('**/api/faturamentos-medicos/**', route => route.fulfill({ json: { items: [{ ...helpers.patient, id: 171, nomePaciente: 'Paciente Clínica Beta', pagamento: '100,00' }], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } }));
    await page.reload();
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Clínica Beta/ })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true })).toHaveCount(0);
    await expect(page.getByText('Paciente Checklist Pago', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /Atendimentos com checklist incompleto/ }).click();
    const modal = page.getByRole('dialog', { name: 'Itens pendentes do checklist', exact: true });
    await expect(modal).toContainText('Paciente Clínica Beta');
    await expect(modal).not.toContainText('Paciente Checklist Pago');
  });

  for (const width of [390, 1280]) for (const level of ['complete', 'synthetic']) test(`checklist #171: exporta PDF e XLSX ${level} ${width}px com conteúdo coerente`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await mockRecords(page, helpers);
    await helpers.loginViaUi(page, '/relatorios');
    await expect(page.getByRole('button', { name: /Itens pendentes do checklist de Paciente Checklist Pago/ })).toBeVisible();
    await page.locator('.billing-filters-summary').click();
    const format = page.getByRole('combobox', { name: 'Formato do relatório', exact: true });
    await expect(format).toHaveValue('complete');
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('paid');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(page.getByText('1 atendimento(s) encontrados', { exact: true })).toBeVisible();
    await format.selectOption(level);
    for (const [label, extension] of [['Exportar Planilha', 'xlsx'], ['Exportar PDF', 'pdf']]) {
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: label, exact: true }).click();
      const download = await downloaded;
      expect(download.suggestedFilename()).toMatch(new RegExp(`^relatorios-hemodinks-\\d{4}-\\d{2}-\\d{2}\\.${extension}$`));
      await download.saveAs(testInfo.outputPath(`report-${level}.${extension}`));
      const buffer = await readFile((await download.path())!);
      expect(buffer.length).toBeGreaterThan(1000);
      const content = buffer.toString(extension === 'pdf' ? 'latin1' : 'utf8');
      if (extension === 'xlsx') {
        expect(content).toContain('Paciente Checklist Pago');
        expect(content).not.toContain('Paciente Outro Atendimento');
        expect(content).toContain('Pagamentos pendentes: 0');
        expect(content).toContain('name="Atendimentos"');
        expect(content.includes('name="Detalhamento de pendências"')).toBe(level === 'complete');
        expect(content.includes('Motivo / orientação')).toBe(level === 'complete');
      } else {
        expect(content.startsWith('%PDF-')).toBe(true);
        // jsPDF escreve o texto WinAnsi sem compressão; acentos são bytes Latin-1.
        const text = [...content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(match => match[1].replace(/\\([()\\])/g, '$1')).join(' ');
        expect(text).toContain('Paciente Checklist Pago');
        expect(text).not.toContain('Paciente Outro Atendimento');
        expect(text).toContain('Pagamentos pendentes: 0');
        expect(text.includes('Detalhamento de pendências')).toBe(level === 'complete');
        expect(text.includes('Líquido estimado a partir de pagamento menos glosa.')).toBe(level === 'complete');
      }
    }
  });
}
