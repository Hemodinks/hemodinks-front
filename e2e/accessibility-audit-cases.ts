import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPatientFormApi } from './patient-form-api';

type Dependencies = {
  setup: (page: Page) => Promise<{ token: string; pacientes: Record<string, any>[] }>;
  login: (page: Page, route?: string) => Promise<void>;
};

async function audit(page: Page, info: TestInfo, state: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await info.attach(`${state}-axe.json`, {
    contentType: 'application/json',
    body: JSON.stringify({ route: new URL(page.url()).pathname, viewport: page.viewportSize(), state,
      theme: await page.locator('html').getAttribute('data-theme'),
      violations: result.violations, incomplete: result.incomplete, passes: result.passes.map(rule => rule.id) }, null, 2),
  });
  expect.soft(result.violations, `${state}: ${result.violations.map(rule => rule.id).join(', ')}`).toEqual([]);
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${state}: overflow`).toBe(true);
}

async function expectActiveOption(input: Locator, option: Locator) {
  await expect(option).toBeVisible();
  const id = await option.getAttribute('id');
  expect.soft(id, 'A opção ativa precisa ter um ID acessível').toBeTruthy();
  expect.soft(await input.getAttribute('aria-activedescendant')).toBe(id);
  await expect.soft(option, 'A navegação por setas deve destacar a opção ativa').not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
}

async function expectOptionInsideList(page: Page, option: Locator) {
  await expect.poll(async () => {
    const bounds = await option.boundingBox();
    const list = await page.getByRole('listbox').boundingBox();
    return Boolean(bounds && list && bounds.y >= list.y && bounds.y + bounds.height <= list.y + list.height + 1);
  }, { message: 'A opção ativa deve permanecer dentro da área rolável da lista' }).toBe(true);
}

export function registerAccessibilityAuditCases({ setup, login }: Dependencies) {
  test.describe('acessibilidade #164', () => {
    let browserErrors: string[];
    test.beforeEach(async ({ page }) => {
      browserErrors = [];
      page.on('pageerror', error => browserErrors.push(error.message));
      page.on('console', message => {
        if (message.type() !== 'error') return;
        const expectedRestore = message.location().url === 'http://localhost:5000/api/session/restaurar'
          && message.text().includes('401');
        if (!expectedRestore) browserErrors.push(message.text());
      });
    });
    test.afterEach(async ({}, info) => {
      await info.attach('browser-errors.json', { contentType: 'application/json', body: JSON.stringify(browserErrors) });
      expect(browserErrors).toEqual([]);
    });
    for (const width of [390, 768, 1280]) {
      test(`rotas principais e tabelas em ${width}px`, async ({ page }, info) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 900 });
        await setup(page);
        for (const [path, heading] of [['/dashboard', 'Olá, George'], ['/usuarios', 'Usuários'],
          ['/pacientes', 'Pacientes'], ['/relatorios', 'Relatórios'], ['/agenda', 'Agenda e notificações']]) {
          await login(page, path);
          await expect(page.getByRole('heading', { name: heading, exact: true,
            ...(path === '/agenda' ? { level: 1 } : {}) })).toBeVisible();
          await expect(page.locator('.loading-overlay')).toHaveCount(0);
          if (path === '/pacientes') {
            const table = page.getByRole('table', { name: 'Pacientes e cirurgias', exact: true });
            await expect(table.getByRole('columnheader', { name: 'Paciente', exact: true })).toBeVisible();
            await expect(table.getByRole('cell', { name: 'Paciente Hemodinks', exact: true })).toBeVisible();
            const header = table.getByRole('columnheader', { name: 'Paciente', exact: true });
            const previousSort = await header.getAttribute('aria-sort');
            await header.getByRole('button', { name: 'Paciente', exact: true }).press('Enter');
            await expect(header).toHaveAttribute('aria-sort', previousSort === 'ascending' ? 'descending' : 'ascending');
          }
          if (path === '/usuarios') {
            await expect(page.locator('.users-table tbody tr')).toHaveCount(1);
            await expect(page.getByRole('img', { name: 'Sem foto de Ana Hemodinks', exact: true })).toBeVisible();
          }
          if (path === '/relatorios' && width === 1280) {
            await expect(page.getByRole('group', { name: 'Opções de faturamento', exact: true })).toBeVisible();
          }
          for (const theme of ['light', 'dark']) {
            await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
            await audit(page, info, `${path.slice(1)}-${theme}`);
          }
          if (path === '/dashboard' && width < 981) {
            const opener = page.getByRole('button', { name: 'Abrir menu', exact: true });
            await opener.focus();
            await opener.press('Enter');
            const drawer = page.getByRole('dialog', { name: 'Menu do sistema', exact: true });
            const close = drawer.getByRole('button', { name: 'Fechar menu', exact: true });
            await expect(close).toBeFocused();
            await close.press('Shift+Tab');
            expect(await drawer.evaluate(el => el.contains(document.activeElement))).toBe(true);
            await page.keyboard.press('Tab');
            await expect(close).toBeFocused();
            await audit(page, info, 'menu-aberto');
            await page.keyboard.press('Escape');
            await expect(drawer).toHaveCount(0);
            await expect(opener).toBeFocused();
          }
        }
      });

      test(`combobox, calendário e erros de formulário em ${width}px`, async ({ page }, info) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        const base = await setup(page);
        const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
        for (let index = 1; index <= 24; index++) api.hospitals.push({ id: 100 + index,
          nome: `Hospital Auditoria ${String(index).padStart(2, '0')}` });
        await login(page, '/pacientes');
        await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
        const save = page.getByRole('button', { name: 'Cadastrar paciente', exact: true });
        await save.click();
        await expect(page.getByLabel('Paciente', { exact: true })).toBeFocused();
        expect(api.writes).toEqual([]);
        await page.getByLabel('Paciente', { exact: true }).fill('Paciente Auditoria Ficticio');
        const date = page.getByLabel('Data da Solicitação', { exact: true });
        await date.fill('01062026');
        const picker = page.getByLabel('Selecionar data da solicitação', { exact: true });
        const pickerButton = picker.locator('..');
        const focusStyle = (element: Element) => {
          const style = getComputedStyle(element);
          return `${style.outlineStyle}/${style.outlineWidth}/${style.boxShadow}`;
        };
        const unfocusedStyle = await pickerButton.evaluate(focusStyle);
        await date.press('Tab');
        await expect(picker).toBeFocused();
        await page.screenshot({ path: info.outputPath('calendario-foco.png') });
        expect.soft(await pickerButton.evaluate(focusStyle), 'O foco do calendário deve ser visível').not.toBe(unfocusedStyle);
        await picker.fill('2026-06-02');
        await expect(date).toHaveValue('02/06/2026');

        const hospital = page.getByRole('combobox', { name: 'Hospital', exact: true });
        await hospital.fill('Santa');
        await hospital.press('ArrowDown');
        const option = page.getByRole('option', { name: 'Santa Clara - Mater Dei', exact: true });
        await expectActiveOption(hospital, option);
        await audit(page, info, 'combobox-aberto');
        await hospital.press('Enter');
        await expect(hospital).toHaveValue('Santa Clara - Mater Dei');
        await hospital.fill('Santa');
        await option.focus();
        await option.press('Enter');
        await expect.soft(hospital).toHaveValue('Santa Clara - Mater Dei');
        await hospital.press('Escape');
        await expect(hospital).toHaveAttribute('aria-expanded', 'false');
        await hospital.fill('Hospital Auditoria');
        await page.getByRole('option', { name: 'Hospital Auditoria 01', exact: true }).hover();
        await hospital.press('ArrowUp');
        const lastHospital = page.getByRole('option', { name: 'Hospital Auditoria 24', exact: true });
        await expectActiveOption(hospital, lastHospital);
        await expectOptionInsideList(page, lastHospital);
        await hospital.fill('Santa');
        await hospital.press('ArrowDown');
        await hospital.press('Enter');
        await save.click();
        const error = page.getByRole('alert');
        await expect(error).toHaveText('Selecione ao menos um procedimento.');
        await expect(error).toBeFocused();
        expect(api.writes).toEqual([]);
        await audit(page, info, 'erro-formulario');

        // Relatórios também usa DateInput, sem os estilos específicos da ficha de paciente.
        await login(page, '/relatorios');
        await page.locator('.billing-filters-summary').press('Enter');
        const reportDate = page.getByLabel('Data inicial da solicitação', { exact: true });
        const reportPicker = page.getByLabel('Selecionar data inicial da solicitação', { exact: true });
        await reportDate.focus();
        const reportButton = reportPicker.locator('..');
        const reportUnfocused = await reportButton.evaluate(focusStyle);
        await reportDate.press('Tab');
        await expect(reportPicker).toBeFocused();
        await page.screenshot({ path: info.outputPath('calendario-relatorios-foco.png') });
        expect.soft(await reportButton.evaluate(focusStyle), 'Calendário dos relatórios precisa de foco visível').not.toBe(reportUnfocused);
      });

      test(`seleção múltipla e modal por teclado em ${width}px`, async ({ page }, info) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        const base = await setup(page);
        const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
        for (let index = 1; index <= 24; index++) api.agreements.push({ idConvenio: 100 + index,
          descricaoConvenio: `Plano Auditoria ${String(index).padStart(2, '0')}` });
        await login(page, '/pacientes');
        await page.locator('.patient-filters-accordion > summary').press('Enter');
        const agreement = page.getByRole('combobox', { name: 'Convênio', exact: true });
        await agreement.fill('Part');
        await agreement.press('ArrowDown');
        await agreement.press('ArrowDown');
        await expectActiveOption(agreement, page.getByRole('option', { name: 'Particular', exact: true }));
        await audit(page, info, 'multiselect-aberto');
        await agreement.press('Enter');
        await expect(page.getByRole('button', { name: 'Remover Particular', exact: true })).toBeVisible();
        await agreement.press('Escape');
        await expect(agreement).toHaveAttribute('aria-expanded', 'false');
        const remove = page.getByRole('button', { name: 'Remover Particular', exact: true });
        await remove.focus();
        await remove.press('Enter');
        await expect(remove).toHaveCount(0);
        await agreement.press('Escape');
        await agreement.fill('Plano Auditoria');
        await agreement.press('ArrowUp');
        const lastAgreement = page.getByRole('option', { name: 'Plano Auditoria 24', exact: true });
        await expectActiveOption(agreement, lastAgreement);
        await expectOptionInsideList(page, lastAgreement);
        await agreement.press('Escape');

        const opener = page.getByRole('button', { name: 'Excluir Paciente Hemodinks', exact: true });
        await opener.focus();
        await opener.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAccessibleName(/excluir/i);
        const confirm = dialog.getByRole('button', { name: 'Sim', exact: true });
        const cancel = dialog.getByRole('button', { name: 'Não', exact: true });
        await expect(cancel).toBeFocused();
        await cancel.press('Shift+Tab');
        await expect(confirm).toBeFocused();
        await confirm.press('Tab');
        await expect(cancel).toBeFocused();
        for (const theme of ['light', 'dark']) {
          await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
          await audit(page, info, `modal-${theme}`);
        }
        const bounds = await dialog.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
        await dialog.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
        expect(api.deleteRequests).toBe(0);
      });
    }
  });
}
