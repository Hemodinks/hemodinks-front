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
  registerAgendaEmailCreatorCases(helpers);
  registerAgendaEmailStatusCases(helpers);
  for (const theme of ['light', 'dark']) for (const width of [320, 360, 390, 768, 1280]) test('agenda email: envio explícito e sem duplicidade em ' + width + 'px ' + theme, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem('hemodinks.theme', value), theme);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const card = await createEvent(page, helpers);
    let posts = 0;
    let queued = false;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/events/*/email-notification*', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: queued
        ? { ...preview, recipients: [{ ...recipient, status: 'pending' }], pendingCount: 1, canSend: false } : preview });
      posts++;
      expect(route.request().postDataJSON()).toEqual({ copyToCreator: false });
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
    const footerVisible = await modal.getByRole('button', { name: 'Confirmar envio por e-mail' }).evaluate(element => { const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= window.innerHeight; });
    await page.screenshot({ path: testInfo.outputPath('agenda-email-modal.png'), fullPage: false });
    expect(footerVisible, JSON.stringify(await modal.evaluate(element => { const panel = element.getBoundingClientRect(); const backdrop = element.parentElement!.getBoundingClientRect(); return { panel: panel.toJSON(), backdrop: backdrop.toJSON(), viewport: window.innerHeight }; }))).toBe(true);
    const audit = await new AxeBuilder({ page }).include('.agenda-email-modal').analyze();
    expect(audit.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('agenda-email-modal.png'), fullPage: false });
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
    await page.route('**/api/events/*/email-notification*', route => {
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


export function registerAgendaEmailCreatorCases(helpers: Helpers) {
  test('agenda email: cópia explícita ao criador, foco e zoom de 200%', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    const card = await createEvent(page, helpers);
    // Browser zoom halves the CSS layout viewport and doubles the device scale.
    const zoom = await page.context().newCDPSession(page);
    await zoom.send('Emulation.setDeviceMetricsOverride', { width: 384, height: 450, deviceScaleFactor: 2, mobile: false });
    const creator = { userId: 99, nome: 'Criador autenticado', email: 'criador@example.test', status: 'available' };
    let posts = 0;
    let optedIn = false;
    await page.route('**/api/events/*/email-notification*', route => {
      if (route.request().method() === 'GET') {
        optedIn = new URL(route.request().url()).searchParams.get('copyToCreator') === 'true';
        return route.fulfill({ json: { ...preview, recipients: optedIn ? [recipient, creator] : [recipient], recipientCount: optedIn ? 2 : 1,
          creatorCopy: { recipient: creator, canSend: true, unavailableReason: null } } });
      }
      posts++;
      expect(route.request().postDataJSON()).toEqual({ copyToCreator: true });
      return route.fulfill({ json: { queuedCount: 2 } });
    });
    const opener = card.getByRole('button', { name: 'Notificar por e-mail', exact: true });
    await opener.click();
    const modal = page.getByRole('dialog', { name: 'Notificar por e-mail', exact: true });
    const option = modal.getByRole('checkbox', { name: /cópia.*criador/i });
    await expect(option).not.toBeChecked();
    await option.check();
    await expect.poll(() => optedIn).toBe(true);
    await expect(modal.getByRole('list', { name: 'Destinatários do e-mail' }).getByText(creator.email)).toBeVisible();
    expect(posts).toBe(0);
    expect(await modal.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await modal.getByRole('button', { name: 'Confirmar envio por e-mail' }).evaluate(element => { const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= window.innerHeight; })).toBe(true);
    const close = modal.getByRole('button', { name: 'Fechar notificação por e-mail' });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(posts).toBe(0);
    await opener.click();
    await expect(option).not.toBeChecked();
    await option.check();
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeEnabled();
    await modal.getByRole('button', { name: 'Confirmar envio por e-mail' }).click();
    await expect(modal.getByText(/Isso ainda não confirma a entrega/)).toBeVisible();
    expect(posts).toBe(1);
  });

  test('agenda email: falha de rede mantém chave e cópia durante atualização e tentativa', async ({ page }) => {
    const card = await createEvent(page, helpers);
    const keys: string[] = [];
    const bodies: unknown[] = [];
    await page.route('**/api/events/*/email-notification*', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { ...preview,
        creatorCopy: { recipient: { userId: 99, nome: 'Criador', email: 'criador@example.test', status: 'available' }, canSend: true, unavailableReason: null } } });
      keys.push(route.request().headers()['idempotency-key']);
      bodies.push(route.request().postDataJSON());
      if (keys.length === 1) return route.abort('failed');
      return route.fulfill({ json: { queuedCount: 1 } });
    });
    await card.getByRole('button', { name: 'Notificar por e-mail', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Notificar por e-mail', exact: true });
    const option = modal.getByRole('checkbox', { name: /cópia.*criador/i });
    await option.check();
    const confirm = modal.getByRole('button', { name: 'Confirmar envio por e-mail' });
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(modal.getByRole('alert')).toBeVisible();
    await expect(option).toBeDisabled();
    await modal.getByRole('button', { name: 'Atualizar destinatários' }).click();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(modal.getByText(/Isso ainda não confirma a entrega/)).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(bodies).toEqual([{ copyToCreator: true }, { copyToCreator: true }]);
  });
}


export function registerAgendaEmailStatusCases(helpers: Helpers) {
  for (const width of [390, 1280]) test('agenda email: fecha após aceite com status lento sem reutilizar resposta antiga em ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const card = await createEvent(page, helpers);
    let reads = 0;
    let posts = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const queued = { ...preview, pendingCount: 1, canSend: false,
      recipients: [{ ...recipient, nome: 'Destinatário atualizado', status: 'pending' }] };
    await page.route('**/api/events/*/email-notification*', async route => {
      if (route.request().method() === 'POST') {
        posts++;
        return route.fulfill({ status: 202, json: { queuedCount: 1 } });
      }
      reads++;
      if (reads === 2) {
        await gate;
        return route.fulfill({ json: { ...queued, recipients: [{ ...recipient, nome: 'Resposta antiga', status: 'pending' }] } });
      }
      return route.fulfill({ json: reads > 2 ? queued : preview });
    });
    const opener = card.getByRole('button', { name: 'Notificar por e-mail', exact: true });
    await opener.click();
    const modal = page.getByRole('dialog', { name: 'Notificar por e-mail', exact: true });
    await modal.getByRole('button', { name: 'Confirmar envio por e-mail' }).click();
    await expect(modal.getByText(/Isso ainda não confirma a entrega/)).toBeVisible();
    await expect.poll(() => reads).toBe(2);
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Atualizar destinatários' })).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Fechar', exact: true })).toBeEnabled();
    await expect(modal.getByRole('button', { name: 'Fechar notificação por e-mail' })).toBeEnabled();
    if (width === 390) await page.keyboard.press('Escape');
    else await modal.getByRole('button', { name: 'Fechar', exact: true }).click();
    await expect(modal).not.toBeVisible();
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(modal.getByText('Destinatário atualizado', { exact: true })).toBeVisible();
    const oldResponse = page.waitForResponse(response => response.url().includes('/email-notification') && response.request().method() === 'GET');
    release();
    await (await oldResponse).finished();
    await expect(modal.getByText('Destinatário atualizado', { exact: true })).toBeVisible();
    await expect(modal.getByText('Resposta antiga', { exact: true })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
    expect(posts).toBe(1);
  });

  test('agenda email: estados da entrega não permitem reenfileirar ou inferir clínica alheia', async ({ page }) => {
    const card = await createEvent(page, helpers);
    let forbidden = false;
    let posts = 0;
    await page.route('**/api/events/*/email-notification*', route => {
      if (route.request().method() === 'POST') posts++;
      return forbidden ? route.fulfill({ status: 404, json: { error: 'Evento não encontrado.' } }) : route.fulfill({ json: {
        ...preview, recipients: [ { ...recipient, status: 'pending' },
          { userId: 2, nome: 'Enviado', email: 'enviado@example.test', status: 'sent' },
          { userId: 3, nome: 'Falhou', email: 'falhou@example.test', status: 'failed' } ],
        recipientCount: 3, pendingCount: 1, sentCount: 1, failedCount: 1, canSend: false,
        creatorCopy: { recipient: null, canSend: false, unavailableReason: 'creator_unknown' },
      } });
    });
    const opener = card.getByRole('button', { name: 'Notificar por e-mail', exact: true });
    await opener.click();
    const modal = page.getByRole('dialog', { name: 'Notificar por e-mail', exact: true });
    await expect(modal.getByText('Aguardando envio', { exact: true })).toBeVisible();
    await expect(modal.getByRole('list').getByText('Enviado', { exact: true })).toHaveCount(2);
    await expect(modal.getByText('Falha no envio', { exact: true })).toBeVisible();
    await expect(modal.getByRole('checkbox', { name: /cópia.*criador/i })).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    forbidden = true;
    await opener.click();
    await expect(modal.getByRole('alert')).toBeVisible();
    await expect(modal.getByText(recipient.email)).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Confirmar envio por e-mail' })).toBeDisabled();
    expect(posts).toBe(0);
  });
}
