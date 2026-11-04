import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { applyThemeForAudit } from './theme-audit';

type Dependencies<TSession> = {
  setup: (page: Page, session?: TSession) => Promise<unknown>;
  login: (page: Page, route?: string, session?: TSession) => Promise<void>;
  nonAdminSession: TSession;
};

const routes = ['/dashboard', '/usuarios', '/pacientes', '/faturamento-medico', '/historico-faturamento', '/relatorios',
  '/tutoriais-interativos', '/grupos-medicos', '/agenda', '/opcoes'];

// 320x800 and 640x450 match a 1280x900 screen zoomed to 400% and 200%.
const reflowViewports = [{ width: 320, height: 800 }, { width: 360, height: 800 }, { width: 640, height: 450 }];

async function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push(`página ${document.documentElement.scrollWidth}px em ${innerWidth}px`);
    for (const element of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary')) {
      if (!element.checkVisibility()) continue;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width) continue;
      let scrollableParent = false;
      for (let parent = element.parentElement; parent && !scrollableParent; parent = parent.parentElement) {
        scrollableParent = ['auto', 'scroll'].includes(getComputedStyle(parent).overflowX);
      }
      if (!scrollableParent && (bounds.right > innerWidth + 1 || bounds.left < -1)) {
        problems.push(`controle cortado: ${element.getAttribute('aria-label') || (element as HTMLElement).innerText}`);
      }
    }
    return problems;
  });
}

async function expectMinimumTarget(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await expect(target).toBeVisible();
  const bounds = await target.boundingBox();
  expect(bounds!.height, `${selector} deve ter ao menos 24px`).toBeGreaterThanOrEqual(24);
}

export function registerResponsiveA11yRefinementCases<TSession>({ setup, login, nonAdminSession }: Dependencies<TSession>) {
  test.describe('acessibilidade #196', () => {
    for (const viewport of reflowViewports) {
      test(`telas sem overflow nem controles cortados em ${viewport.width}x${viewport.height}`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.setViewportSize(viewport);
        await setup(page);
        for (const route of routes) {
          await login(page, route);
          await expect(page.getByRole('button', { name: 'Menu do usuário', exact: true })).toBeVisible();
          await expect(page.locator('.loading-overlay')).toHaveCount(0);
          expect(await layoutProblems(page), route).toEqual([]);
        }
      });
    }

    test('formulários abertos mantêm a barra superior na tela em zoom de 200%', async ({ page }) => {
      await page.setViewportSize({ width: 640, height: 450 });
      await setup(page);
      for (const [route, action] of [['/pacientes', 'Novo paciente'], ['/usuarios', 'Novo usuário']]) {
        await login(page, route);
        await page.getByRole('button', { name: action, exact: true }).click();
        await expect(page.getByRole('heading', { name: action, exact: true }).last()).toBeVisible();
        expect(await layoutProblems(page), action).toEqual([]);
      }
    });

    test('meu cadastro mantém a barra superior na tela em zoom de 200%', async ({ page }) => {
      await page.setViewportSize({ width: 640, height: 450 });
      await setup(page, nonAdminSession);
      await login(page, '/meu-cadastro', nonAdminSession);
      await expect(page.getByRole('heading', { name: 'Meu cadastro', exact: true }).last()).toBeVisible();
      expect(await layoutProblems(page)).toEqual([]);
    });

    test('modal de observações não vaza conteúdo em 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await setup(page);
      await login(page, '/pacientes');
      await page.getByRole('button', { name: /^Observações de / }).first().click();
      const dialog = page.locator('.patient-observacoes-modal');
      await expect(dialog.getByRole('button', { name: 'Enviar observação', exact: true })).toBeVisible();
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    });

    for (const viewport of [{ width: 320, height: 800 }, { width: 320, height: 256 }, { width: 768, height: 1024 }]) {
      test(`menu lateral fica ancorado e inteiro em ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await setup(page);
        await login(page, '/dashboard');
        const opener = page.getByRole('button', { name: 'Abrir menu', exact: true });
        await opener.focus();
        await opener.press('Enter');
        const drawer = page.getByRole('dialog', { name: 'Menu do sistema', exact: true });
        await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeFocused();
        const bounds = await drawer.boundingBox();
        expect(bounds).toMatchObject({ x: 0, y: 0, height: viewport.height });
        await drawer.getByRole('button').last().scrollIntoViewIfNeeded();
        const last = await drawer.getByRole('button').last().boundingBox();
        expect(last!.y + last!.height).toBeLessThanOrEqual(viewport.height);
        await page.keyboard.press('Escape');
        await expect(drawer).toHaveCount(0);
        await expect(opener).toBeFocused();
      });
    }

    for (const width of [320, 768, 1280]) {
      test(`preferências de cookies têm contraste nos dois temas em ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await setup(page);
        await login(page, '/dashboard');
        await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Configurar cookies e armazenamentos', exact: true });
        await expect(dialog).toBeVisible();
        for (const theme of ['light', 'dark']) {
          await applyThemeForAudit(page, theme);
          const audit = await new AxeBuilder({ page }).include('.cookie-preferences-modal').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          expect(audit.violations, theme).toEqual([]);
        }
      });
    }

    test('checkboxes de opções e do aceite jurídico são quadrados de 24px em 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await setup(page);
      await page.goto('/termos-de-uso');
      await expect(page.locator('.legal-acceptance-check input')).toBeVisible();
      expect(await page.locator('.legal-acceptance-check input').boundingBox()).toMatchObject({ width: 24, height: 24 });
      await login(page, '/opcoes');
      const calculator = page.getByRole('checkbox', { name: 'Exibir calculadora flutuante', exact: true });
      await expect(calculator).toBeVisible();
      expect(await calculator.boundingBox()).toMatchObject({ width: 24, height: 24 });
    });

    test('alvos pequenos têm ao menos 24px em tablet e no link jurídico', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setup(page);
      await login(page, '/grupos-medicos');
      await expectMinimumTarget(page, '.sort-header-button');
      await expectMinimumTarget(page, '.breadcrumb-button');
      await page.goto('/termos-de-uso');
      await expectMinimumTarget(page, '.legal-back-link');
    });
  });
}
