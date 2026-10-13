import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Helpers = { mockApi: (page: Page) => Promise<unknown>; loginViaUi: (page: Page, path?: string) => Promise<void> };
const recipient = { userId: 1, nome: 'Participante do evento', email: 'participante@example.test', status: 'available' };
const preview = { recipients: [recipient], recipientCount: 1, pendingCount: 0, sentCount: 0, failedCount: 0, excludedCount: 0, canSend: true };
async function createEvent(page: Page, helpers: Helpers) {
  await helpers.mockApi(page);
  await helpers.loginViaUi(page, '/agenda');
  await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
  await page.getByLabel('Título', { exact: true }).fill('Evento com participantes');
  await page.getByLabel('Enviar notificação para').selectOption('all');
  await page.getByLabel('Mensagem da notificação').fill('Aviso aos participantes');
  await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
  await expect(page.getByText('Evento cadastrado.', { exact: true })).toBeVisible();
  return page.locator('.agenda-event-item').filter({ has: page.getByText('Evento com participantes', { exact: true }) });
}

export function registerAgendaEmailCases(helpers: Helpers) {
  for (const width of [1440, 1024, 768, 390]) test('agenda email: envio explícito e sem duplicidade em ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const card = await createEvent(page, helpers);
    let posts = 0;
    let queued = false;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/events/*/email-notification', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: queued
        ? { ...preview, recipients: [{ ...recipient, status: 'pending' }], pendingCount: 1, canSend: false } : preview });
      posts++;
      expect(route.request().postData()).toBeNull();
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      await gate;
      queued = true;
      return route.fulfill({ json: { queuedCount: 1 } });
    });
    await card.getByRole('button', { name: 'Notificar por e-mail', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Notificar por e-mail', exact: true });
    await expect(modal.getByText(recipient.email)).toBeVisible();
    expect(posts).toBe(0);
    const heading = await modal.getByRole('heading', { name: 'Notificar por e-mail' }).boundingBox();
    const close = await modal.getByRole('button', { name: 'Fechar notificação por e-mail' }).boundingBox();
    expect(heading).not.toBeNull();
    expect(close).not.toBeNull();
    expect(close!.x).toBeGreaterThanOrEqual(heading!.x + heading!.width + 12);
    expect(close!.y).toBeLessThan(heading!.y + heading!.height);
    await page.screenshot({ path: test.info().outputPath('email-modal.png') });
    const audit = await new AxeBuilder({ page }).include('.agenda-email-modal').analyze();
    expect(audit.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(posts).toBe(0);
    await card.getByRole('button', { name: 'Notificar por e-mail', exact: true }).click();
    const confirm = modal.getByRole('button', { name: 'Confirmar envio por e-mail' });
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(modal.getByRole('button', { name: 'Solicitando envio...' })).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
    release();
    await expect(modal.getByText(/Isso ainda não confirma a entrega/)).toBeVisible();
    await expect(modal.getByText('Aguardando envio', { exact: true })).toBeVisible();
    await expect(confirm).toBeDisabled();
    expect(posts).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await modal.getByRole('button', { name: 'Fechar', exact: true }).click();
    await card.getByRole('button', { name: 'Notificar por e-mail', exact: true }).click();
    await expect(confirm).toBeDisabled();
    await expect(confirm).toHaveAccessibleDescription(/já estão na fila de envio ou foram enviados/);
    expect(posts).toBe(1);
    expect(errors).toEqual([]);
  });

  test('agenda email: sem destinatários e autorização negada não permitem envio', async ({ page }) => {
    const card = await createEvent(page, helpers);
    let forbidden = false;
    let posts = 0;
    await page.route('**/api/events/*/email-notification', route => {
      if (route.request().method() === 'POST') posts++;
      return forbidden ? route.fulfill({ status: 403, json: { error: 'Operação não permitida.' } })
        : route.fulfill({ json: { ...preview, recipients: [], recipientCount: 0, canSend: false } });
    });
    await card.getByRole('button', { name: 'Notificar por e-mail', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Notificar por e-mail', exact: true });
    await expect(modal.getByText(/Este evento não possui destinatários/)).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    forbidden = true;
    await card.getByRole('button', { name: 'Notificar por e-mail', exact: true }).click();
    await expect(modal.getByRole('alert')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
    expect(posts).toBe(0);
  });
}
