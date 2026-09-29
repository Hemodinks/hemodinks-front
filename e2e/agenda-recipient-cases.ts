import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Helpers = { mockApi: (page: Page) => Promise<{ createdEventPayload: unknown }>; loginViaUi: (page: Page, path?: string) => Promise<void> };
export function registerAgendaRecipientCases({ mockApi, loginViaUi }: Helpers) {
  test('agenda destinatários: busca paginada, perfis, seleção, lembretes e edição', async ({ page }) => {
    const api = await mockApi(page);
    const users = Array.from({ length: 25 }, (_, i) => ({ id: 100 + i, nome: `Pessoa ${String(i).padStart(2, '0')}`, email: `p${i}@test.local`,
      perfilId: i % 2 ? 1 : 2, perfilNome: i % 2 ? 'Administrador' : 'Médicos' }));
    const queries: string[] = [];
    await page.route('**/api/events/notification-recipients*', route => {
      const url = new URL(route.request().url()); queries.push(url.search);
      const term = (url.searchParams.get('search') || '').toLowerCase();
      const profile = url.searchParams.get('profile'); const number = Number(url.searchParams.get('page') || 1);
      const filtered = users.filter(user => user.nome.toLowerCase().includes(term) &&
        (profile === 'medical' ? user.perfilId === 2 : profile === 'administrative' ? user.perfilId === 1 : true));
      return route.fulfill({ json: { users: filtered.slice((number - 1) * 20, number * 20), groups: [], totalUsers: filtered.length, page: number, pageSize: 20,
        canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos os usuários ativos da clínica, exceto pacientes e você' } });
    });
    await loginViaUi(page, '/agenda');
    await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
    const list = page.getByRole('group', { name: 'Usuários específicos', exact: true });
    await expect(list.getByRole('checkbox')).toHaveCount(20);
    await list.getByRole('checkbox', { name: 'Pessoa 00', exact: true }).check();
    await page.getByRole('navigation', { name: 'Paginação de destinatários' }).getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(list.getByRole('checkbox')).toHaveCount(5);
    await list.getByRole('checkbox', { name: 'Pessoa 20', exact: true }).check();
    await expect(page.getByText('2 destinatários selecionados individualmente')).toBeVisible();
    await page.getByLabel('Filtrar por perfil').selectOption('medical');
    await expect(list.getByRole('checkbox')).toHaveCount(13);
    await page.getByLabel('Buscar usuário', { exact: true }).fill('Pessoa 02');
    await expect(list.getByRole('checkbox')).toHaveCount(1);
    await list.getByRole('checkbox', { name: 'Pessoa 02', exact: true }).check();
    await expect(page.getByText('3 destinatários selecionados individualmente')).toBeVisible();
    expect(queries.some(query => query.includes('profile=medical') && query.includes('Pessoa'))).toBe(true);
    await page.getByLabel('Título', { exact: true }).fill('Destinatários e lembretes');
    await page.getByLabel('Mensagem da notificação').fill('Aviso');
    await expect(page.getByText('5/500 caracteres')).toBeVisible();
    await page.getByLabel('Enviar lembretes aos médicos').check();
    await page.getByLabel('Médicos que receberão lembretes').selectOption('1');
    await page.getByLabel('Repetir lembrete').selectOption('15');
    const audit = await new AxeBuilder({ page }).include('.agenda-form').analyze();
    expect(audit.violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')).toEqual([]);
    await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
    await expect(page.getByText('Evento cadastrado.', { exact: true })).toBeVisible();
    expect(api.createdEventPayload).toMatchObject({ notificationUserIds: [100, 120, 102], notifyMedicalProfile: true, medicalUserId: 1, reminderPeriodMinutes: 15 });
    const card = page.locator('.agenda-event-item').filter({ has: page.getByText('Destinatários e lembretes', { exact: true }) });
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.getByLabel('Médicos que receberão lembretes')).toHaveValue('1');
    await expect(page.getByLabel('Repetir lembrete')).toHaveValue('15');
    await expect(page.getByLabel('Mensagem da notificação')).toHaveValue('');
    await page.getByLabel('Receber lembretes').uncheck();
    await expect(page.getByLabel('Repetir lembrete')).toBeVisible();
    await page.getByLabel('Enviar lembretes aos médicos').uncheck();
    await expect(page.getByLabel('Repetir lembrete')).toHaveCount(0);
    const update = page.waitForRequest(request => request.method() === 'PUT' && request.url().includes('/api/events/'));
    await page.getByRole('button', { name: 'Salvar evento', exact: true }).click();
    expect((await update).postDataJSON()).toMatchObject({ notifyUser: false, notifyMedicalProfile: false, reminderPeriodMinutes: null, notificationUserIds: [] });
    await expect(page.getByText('Evento atualizado.', { exact: true })).toBeVisible();
    await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
    await page.getByLabel('Título', { exact: true }).fill('Todos da clínica');
    await page.getByLabel('Enviar notificação para').selectOption('all');
    await expect(page.getByLabel('Buscar usuário', { exact: true })).toHaveCount(0);
    await page.getByLabel('Mensagem da notificação').fill('Mensagem coletiva');
    await page.getByLabel('Receber lembretes').uncheck();
    await page.getByRole('button', { name: 'Criar evento', exact: true }).click();
    await expect(page.getByText('Evento cadastrado.', { exact: true })).toBeVisible();
    expect(api.createdEventPayload).toMatchObject({ notifyAllAllowedRecipients: true, notificationUserIds: [], notifyUser: false, reminderPeriodMinutes: null });
  });
}
