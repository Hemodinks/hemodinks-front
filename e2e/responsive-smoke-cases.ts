import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { mockPatientFormApi } from './patient-form-api';

type Dependencies = {
  setup: (page: Page) => Promise<{ token: string; pacientes: Record<string, any>[] }>;
  login: (page: Page, route?: string) => Promise<void>;
};

async function expectWithinViewport(page: Page, control: Locator) {
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  await expect.poll(() => control.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.top >= -1
      && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function expectNoOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.width + 1);
}

async function downloadReport(page: Page, name: string, extension: 'pdf' | 'xlsx') {
  const button = page.getByRole('button', { name, exact: true });
  await expectWithinViewport(page, button);
  const pending = page.waitForEvent('download');
  await button.click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(new RegExp(`^pacientes-.*\\.${extension}$`));
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.length).toBeGreaterThan(100);
  expect(bytes.subarray(0, extension === 'pdf' ? 4 : 2).toString()).toBe(extension === 'pdf' ? '%PDF' : 'PK');
  return bytes.toString();
}

// Runs unchanged in every responsive project; viewport and touch come from Playwright config.
export function registerResponsiveSmokeCases({ setup, login }: Dependencies) {
  test.describe('responsive smoke', () => {
    let browserErrors: string[];
    test.beforeEach(async ({ page }) => {
      browserErrors = [];
      page.on('pageerror', error => browserErrors.push(error.message));
      page.on('console', message => {
        if (message.type() !== 'error') return;
        // A fresh browser has no session; this fixture intentionally returns 401 before UI login.
        const expectedBootstrap = message.location().url === 'http://localhost:5000/api/session/restaurar'
          && message.text().includes('401');
        if (!expectedBootstrap) browserErrors.push(message.text());
      });
    });
    test.afterEach(() => expect(browserErrors).toEqual([]));

    test('responsive #163: login, menu e navegação acessível', async ({ page }) => {
      await setup(page);
      await login(page, '/dashboard');
      await expect(page.getByRole('heading', { name: 'Olá, George' })).toBeVisible();
      await expectNoOverflow(page);
      const openMenu = page.getByRole('button', { name: 'Abrir menu', exact: true });
      if (await openMenu.isVisible()) {
        await expectWithinViewport(page, openMenu);
        await openMenu.click();
        await expect(page.getByRole('dialog', { name: 'Menu do sistema' })).toBeVisible();
      }
      const patients = page.getByRole('button', { name: /^Pacientes(?:\s|$)/ });
      await expectWithinViewport(page, patients);
      await patients.click();
      await expect(page.getByRole('heading', { name: 'Pacientes', exact: true })).toBeVisible();
      await expect(page.locator('.patient-list-panel')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Novo paciente', exact: true })).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Menu do sistema' })).toHaveCount(0);
      await expectNoOverflow(page);
      const audit = await new AxeBuilder({ page }).include('.patient-list-panel').analyze();
      expect(audit.violations).toEqual([]);
    });

    test('responsive #163: formulário, teclado, datas e cadastro validado', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
      await login(page, '/pacientes');
      await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
      const save = page.getByRole('button', { name: 'Cadastrar paciente', exact: true });
      await expectWithinViewport(page, save);
      await save.click();
      const patient = page.getByLabel('Paciente', { exact: true });
      await expect(patient).toBeFocused();
      expect(api.writes).toEqual([]);
      await patient.fill('Paciente Responsivo Ficticio');
      const date = page.getByLabel('Data da Solicitação', { exact: true });
      await date.fill('01062026');
      await expect(date).toHaveValue('01/06/2026');
      const picker = page.getByLabel('Selecionar data da solicitação', { exact: true });
      await expectWithinViewport(page, picker);
      await picker.fill('2026-06-02');
      await expect(date).toHaveValue('02/06/2026');
      const hospital = page.getByRole('combobox', { name: 'Hospital', exact: true });
      await hospital.fill('Santa');
      await expect(hospital).toHaveAttribute('aria-expanded', 'true');
      await expectWithinViewport(page, page.getByRole('option', { name: 'Santa Clara - Mater Dei', exact: true }));
      await hospital.press('ArrowDown');
      await hospital.press('Enter');
      await expect(hospital).toHaveValue('Santa Clara - Mater Dei');
      await expect(hospital).toHaveAttribute('aria-expanded', 'false');
      await save.click();
      await expect(page.getByRole('alert')).toHaveText('Selecione ao menos um procedimento.');
      expect(api.writes).toEqual([]);
      await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expectWithinViewport(page, dialog);
      const add = dialog.getByRole('button', { name: 'Adicionar', exact: true });
      await expectWithinViewport(page, add);
      await add.click();
      await expect(dialog).toHaveCount(0);
      await expectWithinViewport(page, save);
      await save.click();
      await expect(page.getByText('Paciente cadastrado com sucesso.', { exact: true })).toBeVisible();
      expect(api.writes).toHaveLength(1);
      expect(api.writes[0]).toMatchObject({ nomePaciente: 'Paciente Responsivo Ficticio', hospitalId: 1,
        hospital: 'Santa Clara - Mater Dei', data: '2026-06-02' });
      expect(api.writes[0]).not.toHaveProperty('clinicaId');
      expect(api.writes[0].procedimentos).toHaveLength(1);
      await expectNoOverflow(page);
    });

    test('responsive #163: tabela filtrada e conteúdo dos downloads PDF e XLSX', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, { ...base.pacientes[0], nomePaciente: 'Paciente Alfa' }, base.token);
      api.patients.push({ ...api.patients[0], id: 22, nomePaciente: 'Paciente Beta', procedimento: 'Cirurgia' });
      await login(page, '/pacientes');
      const rows = page.locator('.patients-table tbody tr');
      await expect(rows).toHaveCount(2);
      await page.locator('.patient-filters-accordion > summary').click();
      const procedure = page.getByLabel('Procedimento', { exact: true });
      await expectWithinViewport(page, procedure);
      await procedure.fill('Consulta');
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText('Paciente Alfa');
      await expect.poll(() => api.queries.some(query => query.get('procedimento') === 'Consulta')).toBe(true);
      await expectWithinViewport(page, page.getByRole('button', { name: 'Editar Paciente Alfa', exact: true }));
      const xlsx = await downloadReport(page, 'Exportar Planilha', 'xlsx');
      expect(xlsx).toContain('Paciente Alfa');
      expect(xlsx).not.toContain('Paciente Beta');
      const pdf = await downloadReport(page, 'Exportar PDF', 'pdf');
      expect(pdf).toContain('Alfa');
      expect(pdf).not.toContain('Beta');
      await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
      await expect(procedure).toHaveValue('');
      await expect(rows).toHaveCount(2);
      await expectNoOverflow(page);
    });
  });
}
