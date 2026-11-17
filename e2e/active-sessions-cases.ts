import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Session = { token: string; user: { perfilId: number } };

// #280: usuários online saem de Clínicas e vão para Opções > Sessões ativas (só SuperAdministrador).
export function registerActiveSessionsCases<TSession extends Session>({ setup, login, session }: {
  setup: (page: Page, session?: TSession) => Promise<unknown>;
  login: (page: Page, route?: string, session?: TSession) => Promise<void>;
  session: TSession;
}) {
  const row = (nome: string, ultimaAtividade: string) => ({
    usuarioGlobalId: nome.length, nome, perfil: 'Administrador', clinicaId: 1, clinica: 'Clínica Alfa', viaEquipe: false,
    inicio: '2026-11-12T08:00:00Z', ultimaAtividade, navegador: 'Chrome · Windows',
  });
  const payload = {
    geradoEm: '2026-11-12T12:00:00Z', janelaOciosidadeMinutos: 30, janelaRecenteHoras: 8, usuariosOnline: 1, totalSessoes: 1,
    porClinica: [{ clinicaId: 1, clinica: 'Clínica Alfa', usuarios: 1, sessoes: 1 }], pagina: 1, tamanhoPagina: 200,
    items: [row('Ana Online', '2026-11-12T11:58:00Z')],
    recentes: [row('Bruno Recente da Clínica Alfa', '2026-11-12T09:00:00Z')],
  };
  // A rota específica vem depois do mock geral: no Playwright, a última rota registrada tem precedência.
  const open = async (page: Page, perfilId: number, path: string, status = 200) => {
    const identity = { ...session, user: { ...session.user, perfilId } };
    const counter = { calls: 0 };
    await setup(page, identity);
    await page.route('**/api/platform/sessoes-ativas?**', route => {
      counter.calls++;
      return status === 200 ? route.fulfill({ json: payload }) : route.fulfill({ status, json: {} });
    });
    await login(page, path, identity);
    return counter;
  };

  test('sessões ativas: aba de Opções do SuperAdministrador com status online e recente', async ({ page }) => {
    const counter = await open(page, 5, '/opcoes');
    await page.getByRole('button', { name: 'Sessões ativas', exact: true }).click();

    const table = page.getByRole('table', { name: 'Sessões ativas' });
    await expect(table.getByRole('row', { name: /Ana Online/ })).toContainText('Online');
    await expect(table.getByRole('row', { name: /Bruno Recente/ })).toContainText('Recente');
    await expect(page.getByText('1 usuário esteve online nas últimas 8 horas')).toBeVisible();
    expect(counter.calls).toBeGreaterThanOrEqual(1);

    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(table.getByText('Bruno Recente da Clínica Alfa')).toBeVisible();
      const audit = await new AxeBuilder({ page }).include('.options-workspace').withTags(['wcag2a', 'wcag2aa']).analyze();
      await expect.poll(() => table.evaluate(el => el.parentElement!.scrollWidth <= el.parentElement!.clientWidth)).toBe(true);
      expect(audit.violations).toEqual([]);    }
  });

  test('sessões ativas: Clínicas não mostra mais os usuários online', async ({ page }) => {
    const counter = await open(page, 5, '/clinicas');
    await expect(page.getByRole('heading', { name: /clinicas cadastradas/ })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Sessões ativas' })).toHaveCount(0);
    expect(counter.calls).toBe(0);
  });

  test('sessões ativas: Administrador não vê a aba nem consulta a API', async ({ page }) => {
    const counter = await open(page, 1, '/opcoes', 403);
    await expect(page.getByRole('button', { name: 'Segurança', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sessões ativas', exact: true })).toHaveCount(0);
    expect(counter.calls).toBe(0);
  });
}
