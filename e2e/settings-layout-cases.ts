import { expect, test, type Page } from '@playwright/test';

type Helpers = { setup: (page: Page) => Promise<unknown>; login: (page: Page, path?: string) => Promise<void> };
const shotDir = process.env.LAYOUT_SHOTS_DIR;

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function shot(page: Page, name: string) {
  if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true });
}

// Layout de Opções → Configurações e do aviso de nova versão (desktop e celular).
export function registerSettingsLayoutCases(helpers: Helpers) {
  for (const width of [390, 1440]) {
    test(`layout de configurações em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await helpers.setup(page);
      await page.route('**/api/auditoria-clinica/configuracao', (route) => route.fulfill({ json: { auditarAtendimentos: false } }));
      await page.route('**/api/users/me/mfa', (route) => route.fulfill({
        json: { elegivel: true, habilitado: false, habilitadoEm: null, codigosRecuperacaoRestantes: 0 } }));
      await helpers.login(page, '/opcoes');
      // Grupos na ordem: preferências, segurança da conta e clínica (administrador).
      await expect(page.getByRole('heading', { name: 'Alterar senha' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Verificação em duas etapas' })).toBeVisible();
      const groups = page.locator('.settings-group-header h3');
      await expect(groups).toHaveText(['Aparência e preferências', 'Segurança da conta', 'Clínica']);
      await expect(page.getByRole('switch', { name: 'Auditar alterações de pacientes e atendimentos' })).toBeVisible();
      await noHorizontalOverflow(page);
      await shot(page, `settings-${width}`);
    });

    test(`layout do aviso de nova versão em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await helpers.setup(page);
      // Simula um deploy novo: o index.html remoto traz outro build id.
      await page.route('**/index.html?app-version-check=*', (route) => route.fulfill({
        contentType: 'text/html', body: '<html><head><meta name="hemodinks-build-id" content="build-novo"></head></html>',
      }));
      await helpers.login(page, '/dashboard');
      const notice = page.locator('.app-update-notice');
      await expect(notice).toBeVisible({ timeout: 15_000 });
      await noHorizontalOverflow(page);
      await shot(page, `update-notice-${width}`);
      await notice.getByRole('button', { name: 'Atualizar sistema' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Continuar trabalhando' })).toBeVisible();
      await noHorizontalOverflow(page);
      await shot(page, `update-dialog-${width}`);
      await dialog.getByRole('button', { name: 'Continuar trabalhando' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(notice).toBeVisible();
    });
  }
}
