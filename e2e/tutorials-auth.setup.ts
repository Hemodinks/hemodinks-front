import { mkdir, writeFile } from 'node:fs/promises';
import { test as setup, expect } from '@playwright/test';

const SESSION_PATH = 'artifacts/tutorials/.auth/homologation-session.json';

setup('autentica em homologação sem gravar credenciais', async ({ page }) => {
  const clinic = process.env.TUTORIAL_CLINIC;
  const email = process.env.TUTORIAL_EMAIL;
  const password = process.env.TUTORIAL_PASSWORD;
  if (!email || !password) throw new Error('Defina TUTORIAL_EMAIL e TUTORIAL_PASSWORD para uma conta fictícia de homologação.');

  await page.goto('/');
  if (clinic) await page.getByRole('combobox', { name: 'Clínica', exact: true }).selectOption(clinic);
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|relatorios)$/);

  const session = await page.evaluate(() => sessionStorage.getItem('hemodinks.session'));
  if (!session) throw new Error('A aplicação não criou uma sessão válida após o login.');
  await mkdir('artifacts/tutorials/.auth', { recursive: true });
  await writeFile(SESSION_PATH, session, { encoding: 'utf8', mode: 0o600 });
});

