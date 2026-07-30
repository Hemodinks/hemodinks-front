import { expect, test } from '@playwright/test';
import { expectTableRowVisible, loginViaUi, mockApi, paciente } from './hemodinks.support';

test('cadastra e edita usuario usando o formulario real', async ({ page }) => {
  const apiState = await mockApi(page);
  await loginViaUi(page, '/usuarios');
  await expect(page.getByText('Ana Hemodinks')).toBeVisible();

  await page.getByRole('button', { name: 'Novo usuário' }).click();
  await expect(page.getByRole('heading', { name: 'Novo usuário' })).toBeVisible();
  await page.getByLabel('Nome completo').fill('Usuario E2E');
  await page.getByLabel('Email').fill('usuario.e2e@hemodinks.com');
  await page.getByLabel('Telefone').fill('81999999999');
  await page.locator('#user-birth-date').fill('10/05/1990');
  await page.locator('.module-form-grid select').first().selectOption('1');
  await page
    .locator('.module-form-grid')
    .getByRole('button', { name: 'Cadastrar usuário' })
    .click();

  await expect(page.getByText(/Usuário cadastrado/)).toBeVisible();
  await expect(page.getByText('Usuario E2E')).toBeVisible();
  expect(apiState.createdUserPayload).toMatchObject({
    nome: 'Usuario E2E',
    email: 'usuario.e2e@hemodinks.com',
    telefone: '+5581999999999',
    cpf: null,
    perfilId: 1,
  });

  await page.locator('tr', { hasText: 'Usuario E2E' }).getByTitle('Editar').click();
  await expect(page.getByRole('heading', { name: 'Editar usuário' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('usuario.e2e@hemodinks.com');
  await page.getByLabel('Nome completo').fill('Usuario Editado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('Usuário atualizado.')).toBeVisible();
  await expectTableRowVisible(page, '.users-table', 'Usuario Editado', 'Carregando usuários...');
  expect(apiState.updatedUserPayload).toMatchObject({
    nome: 'Usuario Editado',
    email: 'usuario.e2e@hemodinks.com',
  });
});

test('cadastra e edita paciente usando o fluxo real do formulario', async ({ page }) => {
  const apiState = await mockApi(page);
  await loginViaUi(page, '/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page.getByRole('button', { name: 'Novo paciente' }).click();
  await expect(page.getByRole('heading', { name: 'Novo paciente' })).toBeVisible();
  await page.getByLabel('Nome completo').fill('Paciente Novo');

  await page
    .locator('.module-form-grid')
    .getByRole('button', { name: 'Cadastrar paciente' })
    .click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible();
  await expect(page.getByText('Paciente Novo')).toBeVisible();
  expect(apiState.createdPacientePayload).toMatchObject({
    nomePaciente: 'Paciente Novo',
    cpf: null,
    telefone: null,
  });

  await page.locator('tr', { hasText: 'Paciente Novo' }).getByTitle('Editar').click();
  await expect(page.getByRole('heading', { name: 'Editar paciente' })).toBeVisible();
  await page.getByLabel('Nome completo').fill('Paciente Editado');
  await page.getByRole('button', { name: 'Salvar paciente' }).click();
  await expect(page.getByText('Paciente atualizado.')).toBeVisible();
  await expectTableRowVisible(
    page,
    '.patients-table',
    'Paciente Editado',
    'Carregando pacientes...',
  );
  expect(apiState.updatedPacientePayload).toMatchObject({
    nomePaciente: 'Paciente Editado',
    cpf: paciente.cpf,
  });
});
