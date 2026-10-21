import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Helpers = { mockApi: (page: Page) => Promise<unknown>; loginViaUi: (page: Page, path?: string) => Promise<void> };
const toggleName = 'Exibir calculadora flutuante';
async function safeSetup(page: Page, helpers: Helpers) {
  await helpers.mockApi(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !(/401/.test(message.text()) && message.location().url.includes('/api/session/restaurar'))) errors.push(message.text());
  });
  return errors;
}
async function noOverlap(page: Page) {
  const rail = await page.locator('.contextual-tools').boundingBox();
  const main = await page.locator('.app-tools-content').boundingBox();
  expect(rail).toBeTruthy(); expect(main).toBeTruthy();
  expect(main!.x + main!.width <= rail!.x + 1 || main!.y >= rail!.y + rail!.height - 1).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
export function registerCalculatorCases(helpers: Helpers) {
  test('issue175: ferramentas iguais, expansão sem sobreposição e calculadora acessível', async ({ page }, info) => {
    const errors = await safeSetup(page, helpers);
    await helpers.loginViaUi(page, '/pacientes');
    const help = page.getByRole('button', { name: 'Abrir ajuda de Pacientes - Cirurgias' });
    const calculator = page.getByRole('button', { name: 'Abrir calculadora', exact: true });
    const helpBox = (await help.boundingBox())!;
    const calculatorBox = (await calculator.boundingBox())!;
    expect(calculatorBox.width).toBeCloseTo(helpBox.width, 0);
    expect(calculatorBox.height).toBeCloseTo(helpBox.height, 0);
    expect(calculatorBox.x).toBeCloseTo(helpBox.x, 0);
    expect(calculatorBox.y - (helpBox.y + helpBox.height)).toBeCloseTo(8, 0);
    await calculator.click();
    await noOverlap(page);
    const result = page.getByLabel('Resultado da calculadora');
    await page.getByRole('region', { name: 'Calculadora' }).getByRole('button', { name: '0', exact: true }).click();
    await page.keyboard.type('.1+.2'); await page.keyboard.press('Enter');
    await expect(result).toHaveText('0,3');
    await page.screenshot({ path: info.outputPath('calculator-open.png'), fullPage: true });
    const a11y = await new AxeBuilder({ page }).include('.contextual-tools').analyze();
    expect(a11y.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(calculator).toBeFocused();
    await calculator.click();
    await page.getByRole('button', { name: 'Fechar calculadora', exact: true }).click();
    await expect(calculator).toHaveAttribute('aria-expanded', 'false');
    await help.click();
    await expect(page.getByRole('heading', { name: 'Pacientes - Cirurgias' })).toBeVisible();
    await noOverlap(page);
    await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Abrir ajuda de Pacientes - Cirurgias' })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Fechar painel da calculadora', exact: true }).click();
    expect(errors).toEqual([]);
  });

  test('issue175: viewport de 320px mantém painel e gatilhos utilizáveis', async ({ page }, info) => {
    await safeSetup(page, helpers);
    await page.setViewportSize({ width: 320, height: 800 });
    await helpers.loginViaUi(page, '/relatorios');
    const button = page.getByRole('button', { name: 'Abrir calculadora', exact: true });
    await button.click();
    await noOverlap(page);
    for (const trigger of await page.locator('.contextual-tool-triggers button').all()) {
      const size = await trigger.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight, scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight, text: element.textContent }));
      expect(size.scrollHeight <= size.height + 1 && size.scrollWidth <= size.width + 1, JSON.stringify(size)).toBe(true);
    }
    await page.getByRole('region', { name: 'Calculadora' }).getByRole('button', { name: '7', exact: true }).click();
    await page.keyboard.type('*8'); await page.keyboard.press('Enter');
    await expect(page.getByLabel('Resultado da calculadora')).toHaveText('56');
    await page.screenshot({ path: info.outputPath('calculator-320px.png'), fullPage: true });
  });

  test('issue175: configuração persiste em navegação reload e nova sessão', async ({ page }) => {
    const errors = await safeSetup(page, helpers);
    await helpers.loginViaUi(page, '/opcoes');
    const setting = page.getByRole('checkbox', { name: toggleName });
    await expect(setting).toBeChecked();
    await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
    await setting.uncheck();
    await expect(page.getByRole('button', { name: /calculadora/i })).toHaveCount(0);
    await page.goto('/faturamento-medico');
    await expect(page.getByRole('button', { name: 'Abrir calculadora', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Abrir calculadora', exact: true })).toHaveCount(0);
    await page.goto('/opcoes');
    await expect(setting).not.toBeChecked();
    // A new authenticated session must restore only the visibility preference.
    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await helpers.loginViaUi(page, '/opcoes');
    await expect(setting).not.toBeChecked();
    await setting.check();
    await expect(page.getByRole('button', { name: 'Abrir calculadora', exact: true })).toHaveAttribute('aria-expanded', 'false');
    expect(errors).toEqual([]);
  });

  test('issue175: cálculo é independente de formulários e navegação de faturamento e relatórios', async ({ page }) => {
    const errors = await safeSetup(page, helpers);
    await helpers.loginViaUi(page, '/pacientes');
    await page.getByRole('button', { name: 'Editar Paciente Hemodinks', exact: true }).click();
    const received = page.getByRole('textbox', { name: 'Valor recebido/pago', exact: true });
    const previous = await received.inputValue();
    await received.scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Calculadora' })).toBeInViewport({ ratio: 0.95 });
    await page.getByRole('region', { name: 'Calculadora' }).getByRole('button', { name: '8', exact: true }).click();
    await page.keyboard.type('/0'); await page.keyboard.press('Enter');
    await expect(page.getByRole('alert').filter({ hasText: /zero/ })).toBeVisible();
    await expect(received).toHaveValue(previous);
    await noOverlap(page);
    await page.getByRole('button', { name: 'Fechar painel da calculadora' }).click();
    for (const path of ['/faturamento-medico', '/relatorios']) {
      await page.goto(path);
      await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
      await expect(page.getByLabel('Resultado da calculadora')).toHaveText('0');
      await noOverlap(page);
      await page.keyboard.press('Escape');
    }
    expect(errors).toEqual([]);
  });

  test('issue175: preferência e cálculo não vazam entre usuários e clínicas', async ({ page }) => {
    const errors = await safeSetup(page, helpers);
    const authentication = page.waitForResponse(response => new URL(response.url()).pathname === '/api/users/authenticate');
    await helpers.loginViaUi(page, '/opcoes');
    const current = await (await authentication).json();
    await page.getByRole('checkbox', { name: toggleName }).uncheck();
    for (const [id, clinic] of [[current.id, 2], [999, 1], [current.id, 1]]) {
      const claims = JSON.parse(Buffer.from(current.token.split('.')[1], 'base64url').toString());
      const token = `test.${Buffer.from(JSON.stringify({ ...claims, sub: String(id), clinicaId: clinic, clinicaSlug: clinic === 1 ? 'clinica-hemodinks' : 'beta' })).toString('base64url')}.signature`;
      await page.route('**/api/session/restaurar', route => route.fulfill({ json: {
        ...current, token, clinicaId: clinic, clinicaSlug: clinic === 1 ? 'clinica-hemodinks' : 'beta',
        id, usuarioGlobalId: id, usuarioClinicaId: id,
      } }));
      await page.reload();
      const own = id === current.id && clinic === 1;
      await expect(page.getByRole('checkbox', { name: toggleName })).toBeChecked({ checked: !own });
      if (!own) {
        await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
        await expect(page.getByLabel('Resultado da calculadora')).toHaveText('0');
        await page.getByRole('region', { name: 'Calculadora' }).getByRole('button', { name: '9', exact: true }).click();
      }
    }
    expect(errors).toEqual([]);
  });
}
