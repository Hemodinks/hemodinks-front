import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { mockPatientFormApi } from './patient-form-api';

type Dependencies = {
  setup: (page: Page) => Promise<{ pacientes: Record<string, any>[] }>;
  login: (page: Page, route?: string) => Promise<void>;
};

async function addProcedure(page: Page) {
  await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function download(page: Page, label: string, extension: string, prefix: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(new RegExp(`^${prefix}.*\\.${extension}$`));
  expect(await file.failure()).toBeNull();
  const bytes = await readFile((await file.path())!);
  expect(bytes.length).toBeGreaterThan(100);
  expect(bytes.subarray(0, extension === 'pdf' ? 4 : 2).toString()).toBe(extension === 'pdf' ? '%PDF' : 'PK');
  return bytes;
}

async function noOverflow(page: Page) {
  const problems = await page.locator('.patient-form-panel :is(input:not(.sr-only), textarea, button, .combobox-listbox)').evaluateAll((elements) => elements.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width && (rect.left < -1 || rect.right > window.innerWidth + 1);
  }).map((el) => el.outerHTML.slice(0, 150)));
  expect(problems).toEqual([]);
  const overflow = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('body *')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.right > innerWidth + 1;
    }).slice(0, 12).map((el) => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right })),
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
}

export function registerPatientFormTests({ setup, login }: Dependencies) {
  test.describe('ficha paciente', () => {
    test('cadastra com novos vínculos, edita sem duplicar, exporta a ficha e envia arquivo', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0]);
      await login(page, '/pacientes');
      await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Exportar ficha PDF' })).toBeDisabled();
      await page.getByRole('button', { name: 'Cadastrar paciente' }).click();
      await expect(page.getByLabel('Paciente', { exact: true })).toBeFocused();
      await page.getByLabel('Paciente', { exact: true }).fill('Paciente Fluxo Completo');
      await page.getByLabel('Selecionar data da solicitação', { exact: true }).fill('2026-06-01');
      await expect(page.getByLabel('Data da Solicitação', { exact: true })).toHaveValue('01/06/2026');
      await page.getByLabel('Selecionar cirurgias consolidadas', { exact: true }).fill('2030-12-01');
      for (const [label, value, hint] of [
        ['Hospital', 'Hospital Novo E2E', 'Novo hospital: será cadastrado ao salvar.'],
        ['Convênio', 'Convênio Novo E2E', 'Novo convênio: será cadastrado ao salvar.'],
        ['Fornecedor OPME', 'Fornecedor Novo E2E', 'Novo fornecedor: será cadastrado ao salvar.'],
      ]) {
        await page.getByRole('combobox', { name: label, exact: true }).fill(value);
        await expect(page.getByText(hint, { exact: true })).toBeVisible();
        await page.getByRole('combobox', { name: label, exact: true }).press('Tab');
      }
      const surgeon = page.getByRole('combobox', { name: 'Cirurgião', exact: true });
      await surgeon.fill('Ana');
      await surgeon.press('ArrowDown');
      await surgeon.press('Enter');
      await expect(surgeon).toHaveValue('Ana Hemodinks');
      await page.getByRole('button', { name: 'Cadastrar paciente' }).click();
      await expect(page.getByRole('alert')).toHaveText('Selecione ao menos um procedimento.');
      expect(api.writes).toHaveLength(0);
      await addProcedure(page);
      await page.getByRole('button', { name: 'Remover procedimento' }).click();
      await expect(page.getByText('Nenhum procedimento selecionado.')).toBeVisible();
      await addProcedure(page);
      await expect(page.getByLabel('Valor estimado', { exact: true })).toHaveValue(/120,00/);
      await page.getByLabel('Valor recebido/pago', { exact: true }).fill('10000');
      await expect(page.getByLabel('Glosa', { exact: true })).toHaveValue(/20,00/);
      await expect(page.getByLabel('Data do Pagamento', { exact: true })).toBeDisabled();
      await page.getByLabel('Status Pago', { exact: true }).check();
      await page.getByLabel('Selecionar data do pagamento', { exact: true }).fill('2026-06-02');
      await page.getByLabel('Status Pago', { exact: true }).uncheck();
      await expect(page.getByLabel('Data do Pagamento', { exact: true })).toHaveValue('');
      await page.getByLabel('Informações Adicionais', { exact: true }).fill('Informação clínica fictícia');
      await page.getByLabel('Tratamento médico', { exact: true }).fill('Tratamento fictício');
      await page.getByLabel('Arquivos do paciente').setInputFiles({ name: 'documento-teste.txt', mimeType: 'text/plain', buffer: Buffer.from('Documento fictício E2E') });
      await expect(page.getByText('documento-teste.txt', { exact: true })).toBeVisible();
      await download(page, 'Exportar ficha PDF', 'pdf', 'cadastro-paciente-');
      await download(page, 'Exportar ficha Excel', 'xlsx', 'cadastro-paciente-');
      await page.getByRole('button', { name: 'Cadastrar paciente' }).click();
      await expect(page.getByText('Paciente cadastrado com sucesso.', { exact: true })).toBeVisible();
      expect(api.writes).toHaveLength(1);
      expect(api.writes[0]).toMatchObject({ hospitalId: null, hospital: 'Hospital Novo E2E', convenioId: null, opmeFornecedorId: null, medicoUserId: 1 });
      expect(api.hospitals).toHaveLength(2);
      expect(api.agreements).toHaveLength(2);
      expect(api.suppliers).toHaveLength(2);
      expect(api.uploads).toHaveLength(1);
      const saved = api.patients.find((p) => p.nomePaciente === 'Paciente Fluxo Completo')!;
      expect(saved).toMatchObject({ hospitalId: 101, convenioId: 101, opmeFornecedorId: 101 });
      await page.getByRole('button', { name: 'Editar Paciente Fluxo Completo', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Hospital', exact: true })).toHaveValue('Hospital Novo E2E');
      await expect(page.getByRole('textbox', { name: 'Tratamento médico', exact: true })).toHaveValue('Tratamento fictício');
      await expect(page.getByRole('button', { name: 'documento-teste.txt', exact: true })).toBeVisible();
      await download(page, 'Exportar ficha PDF', 'pdf', 'cadastro-paciente-');
      await download(page, 'Exportar ficha Excel', 'xlsx', 'cadastro-paciente-');
      await page.getByLabel('Paciente', { exact: true }).fill('Paciente Fluxo Editado');
      await page.getByRole('button', { name: 'Salvar alterações' }).click();
      await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
      expect(api.writes[1]).toMatchObject({ nomePaciente: 'Paciente Fluxo Editado', hospitalId: 101, convenioId: 101, opmeFornecedorId: 101 });
      expect(api.hospitals).toHaveLength(2);
      expect(api.agreements).toHaveLength(2);
      expect(api.suppliers).toHaveLength(2);
      await page.getByRole('button', { name: 'Editar Paciente Fluxo Editado', exact: true }).click();
      await expect(page.getByLabel('Paciente', { exact: true })).toHaveValue('Paciente Fluxo Editado');
    });

    test('mantém filtros, exportações da listagem e ações após o nome, com exclusão confirmada', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0]);
      api.patients.push({ ...api.patients[0], id: 22, nomePaciente: 'Paciente Outro', procedimento: 'Outro procedimento' });
      await login(page, '/pacientes');
      await page.locator('.patient-filters-accordion > summary').click();
      await page.getByLabel('Procedimento', { exact: true }).fill('Consulta');
      await expect(page.locator('.patients-table tbody tr')).toHaveCount(1);
      expect(api.queries.some((query) => query.get('procedimento') === 'Consulta')).toBe(true);
      const row = page.locator('.patients-table tbody tr').first();
      await expect(row.locator('td').nth(0)).toHaveText('Paciente Hemodinks');
      await expect(row.locator('td').nth(1).getByTitle('Editar')).toBeVisible();
      await expect(row.locator('td').nth(1).getByTitle('Excluir', { exact: true })).toBeVisible();
      const bytes = await download(page, 'Exportar Planilha', 'xlsx', 'pacientes-');
      expect(bytes.toString()).toContain('Paciente Hemodinks');
      expect(bytes.toString()).not.toContain('Paciente Outro');
      await download(page, 'Exportar PDF', 'pdf', 'pacientes-');
      await row.getByTitle('Excluir', { exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Sim', exact: true }).click();
      await expect(page.getByText('Paciente excluído.', { exact: true })).toBeVisible();
      expect(api.patients.some((p) => p.id === 10)).toBe(false);
    });

    test('preserva os dados e mostra erro de salvamento e de upload', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0]);
      await login(page, '/pacientes');
      await page.getByRole('button', { name: 'Editar Paciente Hemodinks', exact: true }).click();
      await page.getByLabel('Paciente', { exact: true }).fill('Paciente Com Erro');
      api.failSave = true;
      await page.getByRole('button', { name: 'Salvar alterações' }).click();
      await expect(page.getByRole('alert')).toHaveText('Não foi possível salvar o paciente de teste.');
      await expect(page.getByLabel('Paciente', { exact: true })).toHaveValue('Paciente Com Erro');
      await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
      api.failSave = false;
      api.failUpload = true;
      await page.getByLabel('Arquivos do paciente').setInputFiles({ name: 'teste.txt', mimeType: 'text/plain', buffer: Buffer.from('Teste') });
      await page.getByRole('button', { name: 'Salvar alterações' }).click();
      await expect(page.getByRole('alert')).toHaveText('Não foi possível enviar o arquivo de teste.');
      await expect(page.getByText('teste.txt', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Remover arquivo', exact: true }).click();
      await expect(page.getByText('Nenhum arquivo anexado.', { exact: true })).toBeVisible();
    });

    for (const width of [320, 360, 375, 390, 414, 768, 1024, 1440]) {
      test(`responsividade e controles em ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await setup(page);
        await login(page, '/pacientes');
        await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
        for (const name of ['Dados principais', 'Dados da cirurgia', 'Equipe médica', 'Procedimentos', 'Financeiro', 'Informações complementares', 'Arquivos']) {
          await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
        }
        await noOverflow(page);
        await page.getByLabel('Selecionar data da solicitação', { exact: true }).fill('2026-06-01');
        await expect(page.getByLabel('Data da Solicitação', { exact: true })).toHaveValue('01/06/2026');
        const hospital = page.getByRole('combobox', { name: 'Hospital', exact: true });
        await hospital.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await hospital.fill('Santa');
        await expect(page.getByRole('option', { name: 'Santa Clara - Mater Dei' })).toBeVisible();
        await noOverflow(page);
        const listbox = await page.getByRole('listbox').boundingBox();
        expect(listbox!.y + listbox!.height).toBeLessThanOrEqual(900);
        await hospital.press('ArrowDown');
        await hospital.press('Enter');
        await expect(hospital).toHaveValue('Santa Clara - Mater Dei');
        await page.getByRole('button', { name: 'Adicionar procedimento' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(901);
        await expect(dialog.getByRole('button', { name: 'Adicionar', exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Adicionar', exact: true }).click();
        await expect.poll(() => page.evaluate(() => ({
          target: document.activeElement?.getAttribute('data-tour'),
          active: document.activeElement?.tagName,
        })) ).toEqual({ target: 'patients-procedure', active: 'BUTTON' });
        await page.getByLabel('Arquivos do paciente').setInputFiles({ name: 'documento-com-nome-longo-para-verificar-responsividade.txt', mimeType: 'text/plain', buffer: Buffer.from('Teste') });
        await noOverflow(page);
        await page.screenshot({ path: testInfo.outputPath(`ficha-${width}.png`), fullPage: true });
        if (width === 390 || width === 1440) {
          for (const theme of ['light', 'dark']) {
            await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
            const result = await new AxeBuilder({ page }).include('.patient-form-panel').analyze();
            expect(result.violations).toEqual([]);
            await page.screenshot({ path: testInfo.outputPath(`ficha-${width}-${theme}.png`), fullPage: true });
          }
        }
      });
    }
  });
}
