import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const SESSION_PATH = 'artifacts/tutorials/.auth/homologation-session.json';
const VISUAL_PAUSE = Number(process.env.TUTORIAL_VISUAL_PAUSE_MS ?? 650);

test('relatórios — missão passiva', async ({ page }) => {
  const session = await readFile(SESSION_PATH, 'utf8');
  await page.addInitScript((storedSession) => sessionStorage.setItem('hemodinks.session', storedSession), session);
  await page.goto('/relatorios');
  await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
  await page.waitForTimeout(VISUAL_PAUSE);
  await page.getByRole('complementary', { name: 'Ajuda contextual' }).getByRole('button', { name: /abrir ajuda de relatórios/i }).click();
  await page.waitForTimeout(VISUAL_PAUSE);
  await page.getByRole('button', { name: /iniciar missão: dominar os relatórios|reiniciar missão: dominar os relatórios/i }).click();

  const mission = page.locator('.tutorial-mission-popover');
  const runtime = page.locator('[data-tutorial-audio-state]');
  for (const step of [1, 2]) {
    await expect(mission).toContainText(`Etapa ${step} de 7`);
    await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
    await page.waitForTimeout(VISUAL_PAUSE);
    await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  }
  await expect(mission).toContainText('Etapa 3 de 7');
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
  await page.waitForTimeout(VISUAL_PAUSE);
  await page.getByRole('textbox', { name: 'Data inicial do atendimento', exact: true }).click();
  await expect(mission).toContainText('Etapa 4 de 7');
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
  await page.waitForTimeout(VISUAL_PAUSE);
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 5 de 7');
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
  await page.waitForTimeout(VISUAL_PAUSE);
  await page.getByRole('button', { name: 'Consultar' }).click();
  for (const step of [6, 7]) {
    await expect(mission).toContainText(`Etapa ${step} de 7`);
    await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
    await page.waitForTimeout(VISUAL_PAUSE);
    await mission.getByRole('button', { name: step === 7 ? 'Concluir tutorial' : 'Continuar tutorial' }).click();
  }
  await expect(page.getByRole('status')).toContainText('Missão concluída');
  await page.waitForTimeout(VISUAL_PAUSE);
});
