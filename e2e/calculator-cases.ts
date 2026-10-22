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
  for (const width of [320, 768, 1440]) {
    test(`histórico temporário da calculadora em ${width}px`, async ({ page }, info) => {
      const errors = await safeSetup(page, helpers);
      await page.setViewportSize({ width, height: 900 });
      await helpers.loginViaUi(page, '/pacientes');
      const open = page.getByRole('button', { name: 'Abrir calculadora', exact: true });
      await open.click();
      const panel = page.getByRole('region', { name: 'Calculadora', exact: true });
      const history = panel.getByRole('region', { name: 'Histórico de operações' });
      await panel.getByRole('button', { name: '8', exact: true }).click();
      await page.keyboard.type('*5=+9=');
      await expect(history.getByRole('listitem')).toHaveText(['40 + 9 =49', '8 × 5 =40']);
      await page.keyboard.press('Delete');
      await expect(history.getByRole('listitem')).toHaveCount(2);
      await noOverlap(page);
      await history.scrollIntoViewIfNeeded();
      expect((await new AxeBuilder({ page }).include('.contextual-tools').analyze()).violations).toEqual([]);
      await page.screenshot({ path: info.outputPath(`calculator-history-${width}.png`), fullPage: true });
      await panel.getByRole('button', { name: 'Limpar histórico' }).focus();
      await page.keyboard.press('Enter');
      await expect(history.getByRole('listitem')).toHaveCount(0);
      await expect(panel.getByLabel('Resultado da calculadora')).toHaveText('0');
      await panel.getByRole('button', { name: '2', exact: true }).click();
      await page.keyboard.type('+3=');
      await expect(history.getByRole('listitem')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await open.click();
      await expect(history.getByRole('listitem')).toHaveCount(0);
      await expect(history.getByText('Nenhuma operação nesta utilização.')).toBeVisible();
      await page.reload();
      await open.click();
      await expect(history.getByRole('listitem')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test('issue178: destaque de ajuda respeita movimento reduzido e mantém os acionadores separados', async ({ page }) => {
    const errors = await safeSetup(page, helpers);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await helpers.loginViaUi(page, '/pacientes');
    const help = page.getByRole('button', { name: 'Abrir ajuda de Pacientes - Cirurgias' });
    const calculator = page.getByRole('button', { name: 'Abrir calculadora', exact: true });
    await expect(help).toHaveCSS('animation-name', 'contextual-tool-help-invite');
    await expect(calculator).toHaveCSS('animation-name', 'none');
    await help.evaluate(element => {
      const animation = element.getAnimations()[0];
      animation.pause(); animation.currentTime = 2368;
    });
    const helpBox = (await help.boundingBox())!;
    const calculatorBox = (await calculator.boundingBox())!;
    const rail = (await page.locator('.contextual-tools').boundingBox())!;
    expect(helpBox.x).toBeGreaterThanOrEqual(rail.x);
    expect(helpBox.x + helpBox.width).toBeLessThanOrEqual(rail.x + rail.width);
    expect(calculatorBox.y - helpBox.y - helpBox.height).toBeGreaterThan(12);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(help).toHaveCSS('animation-name', 'none');
    await help.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Pacientes - Cirurgias' })).toBeVisible();
    await noOverlap(page);
    await page.keyboard.press('Escape');
    await expect(help).toBeFocused();
    expect(errors).toEqual([]);
  });

  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`issue178: porcentagem, contraste e teclas acessíveis em ${width}px`, async ({ page }, info) => {
      const errors = await safeSetup(page, helpers);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await helpers.loginViaUi(page, '/pacientes');
      await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
      const panel = page.getByRole('region', { name: 'Calculadora', exact: true });
      await noOverlap(page);
      await panel.getByRole('button', { name: 'Limpar', exact: true }).click();
      for (const [input, expected] of [['10%', '0,1'], ['200+10%=', '220'], ['200-10%=', '180'], ['200*10%=', '20'], ['200/10%=', '2000']]) {
        await page.keyboard.press('Delete');
        await page.keyboard.type(input);
        await expect(page.getByLabel('Resultado da calculadora')).toHaveText(expected);
      }
      await page.keyboard.press('Delete'); await page.keyboard.type('200+10');
      await panel.getByRole('button', { name: 'Porcentagem', exact: true }).click();
      await panel.getByRole('button', { name: 'Igual', exact: true }).click();
      await expect(page.getByLabel('Resultado da calculadora')).toHaveText('220');
      await page.keyboard.press('Delete'); await page.keyboard.type('999999999999');
      const keySizes = await panel.locator('.calculator-keys button').evaluateAll(keys => keys.map(key => {
        const rect = key.getBoundingClientRect(); return { width: rect.width, height: rect.height };
      }));
      expect(keySizes).toHaveLength(20);
      for (const size of keySizes) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
        const backgrounds = await panel.locator('.calculator-key-number, .calculator-key-operator, .calculator-key-utility, .calculator-key-equals')
          .evaluateAll(keys => Object.fromEntries(keys.map(key => [key.className, getComputedStyle(key).backgroundColor])));
        expect(new Set(Object.values(backgrounds)).size).toBe(4);
        expect((await new AxeBuilder({ page }).include('.contextual-tools').analyze()).violations).toEqual([]);
        await page.screenshot({ path: info.outputPath(`calculator-${width}-${theme}.png`), fullPage: true });
      }
      expect(await page.getByLabel('Resultado da calculadora').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.getByRole('button', { name: 'Fechar painel da calculadora', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Abrir calculadora', exact: true })).toBeFocused();
      expect(errors).toEqual([]);
    });
  }

  test('issue178: reflow equivalente a zoom de 200% mantém painel, teclado e formulário utilizáveis', async ({ page }, info) => {
    const errors = await safeSetup(page, helpers);
    // 1280x900 at 200% zoom exposes a 640x450 CSS viewport with doubled pixels.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 450, deviceScaleFactor: 2, mobile: false });
    await helpers.loginViaUi(page, '/pacientes');
    await page.getByRole('button', { name: 'Abrir calculadora', exact: true }).click();
    await noOverlap(page);
    const panel = page.getByRole('region', { name: 'Calculadora', exact: true });
    await panel.getByRole('button', { name: 'Limpar', exact: true }).click();
    await page.keyboard.type('200+10%=');
    await expect(page.getByLabel('Resultado da calculadora')).toHaveText('220');
    await panel.getByRole('button', { name: 'Igual' }).scrollIntoViewIfNeeded();
    await expect(panel.getByRole('button', { name: 'Igual' })).toBeInViewport();
    await page.screenshot({ path: info.outputPath('calculator-reflow-200.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Abrir calculadora', exact: true })).toBeFocused();
    expect(errors).toEqual([]);
    await cdp.detach();
  });

  test('issue175: ferramentas iguais, expansão sem sobreposição e calculadora acessível', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await safeSetup(page, helpers);
    await helpers.loginViaUi(page, '/pacientes');
    const help = page.getByRole('button', { name: 'Abrir ajuda de Pacientes - Cirurgias' });
    const calculator = page.getByRole('button', { name: 'Abrir calculadora', exact: true });
    const helpBox = (await help.boundingBox())!;
    const calculatorBox = (await calculator.boundingBox())!;
    expect(calculatorBox.width).toBeCloseTo(helpBox.width, 0);
    expect(calculatorBox.height).toBeCloseTo(helpBox.height, 0);
    expect(calculatorBox.x).toBeCloseTo(helpBox.x, 0);
    expect(calculatorBox.y - (helpBox.y + helpBox.height)).toBeCloseTo(16, 0);
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
