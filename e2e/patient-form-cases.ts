import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { mockPatientFormApi } from './patient-form-api';

type Dependencies = {
  setup: (page: Page) => Promise<{ token: string; pacientes: Record<string, any>[] }>;
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
    for (const width of [390, 1440]) {
      const message = 'A data da consolidação não pode ser anterior à data da solicitação.';
      test(`issue182: criação valida datas digitadas e selecionadas em ${width}px`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 900 });
        const base = await setup(page);
        const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
        await login(page, '/pacientes');
        await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
        await page.getByLabel('Paciente', { exact: true }).fill('Paciente Datas');
        await page.getByRole('combobox', { name: 'Hospital', exact: true }).fill('Hospital Datas');
        await page.getByRole('combobox', { name: 'Hospital', exact: true }).press('Tab');
        await page.getByRole('combobox', { name: 'Cirurgião', exact: true }).fill('Ana');
        await page.getByRole('option', { name: 'Ana Hemodinks', exact: true }).click();
        await addProcedure(page);
        const request = page.getByLabel('Data da Solicitação', { exact: true });
        const consolidated = page.getByLabel('Cirurgias Consolidadas', { exact: true });
        if (width === 390) {
          await request.fill('10102026'); await consolidated.fill('09102026');
        } else {
          await page.getByLabel('Selecionar data da solicitação', { exact: true }).fill('2026-10-10');
          await page.getByLabel('Selecionar cirurgias consolidadas', { exact: true }).fill('2026-10-09');
        }
        await expect(page.getByRole('alert')).toHaveText(message);
        await expect(consolidated).toHaveAccessibleDescription(message);
        await expect(page.getByLabel('Selecionar cirurgias consolidadas', { exact: true })).toHaveAttribute('min', '2026-10-10');
        await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
        expect(api.writes).toHaveLength(0);
        await expect(consolidated).toBeFocused();
        await expect(consolidated).toHaveValue('09/10/2026');
        await noOverflow(page);
        expect((await new AxeBuilder({ page }).include('.patient-form-panel').analyze()).violations).toEqual([]);
        await page.screenshot({ path: info.outputPath(`invalid-dates-${width}.png`), fullPage: true });
        // Changing the request date must revalidate the already-entered consolidation.
        await request.fill('09102026');
        await expect(page.getByRole('alert')).toHaveCount(0);
        await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
        await expect(page.getByText('Paciente cadastrado com sucesso.', { exact: true })).toBeVisible();
        expect(api.writes).toHaveLength(1);
        expect(api.writes[0]).toMatchObject({ data: '2026-10-09', dataAtendimento: '2026-10-09' });
        await page.getByRole('button', { name: 'Editar Paciente Datas', exact: true }).click();
        await consolidated.fill('11102026');
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes[1]).toMatchObject({ data: '2026-10-09', dataAtendimento: '2026-10-11' });
      });

      test(`issue182: edição de legado e datas opcionais em ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const base = await setup(page);
        const api = await mockPatientFormApi(page, { ...base.pacientes[0],
          data: '2026-10-10T00:30:00+14:00', dataAtendimento: '2026-10-09T23:30:00-12:00' }, base.token);
        await login(page, '/pacientes');
        const edit = () => page.getByRole('button', { name: 'Editar Paciente Hemodinks', exact: true }).click();
        const save = () => page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        const request = page.getByLabel('Data da Solicitação', { exact: true });
        const consolidated = page.getByLabel('Cirurgias Consolidadas', { exact: true });
        await edit();
        await expect(request).toHaveValue('10/10/2026');
        await expect(consolidated).toHaveValue('09/10/2026');
        await expect(page.getByRole('alert')).toHaveText(message);
        await save(); expect(api.writes).toHaveLength(0);
        await consolidated.fill('10102026'); await save();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes).toHaveLength(1);
        await edit(); await request.fill('11102026');
        await expect(page.getByRole('alert')).toHaveText(message);
        await save(); expect(api.writes).toHaveLength(1);
        await request.clear(); await save();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes[1]).toMatchObject({ data: null, dataAtendimento: '2026-10-10' });
        await edit(); await consolidated.clear(); await save();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes[2]).toMatchObject({ data: null, dataAtendimento: null });
        await edit(); await request.fill('10102026'); await save();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes[3]).toMatchObject({ data: '2026-10-10', dataAtendimento: null });
      });
    }

    for (const width of [1440, 390]) {
      test(`issue174: equipe cirurgica, edicao e exportacao ${width}`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 900 });
        const base = await setup(page);
        const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
        await login(page, '/pacientes');
        await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
        await page.getByLabel('Paciente', { exact: true }).fill('Paciente Equipe 174');
        await page.getByRole('combobox', { name: 'Hospital', exact: true }).fill('Hospital 174');
        await page.getByRole('combobox', { name: 'Hospital', exact: true }).press('Tab');
        await addProcedure(page);
        const surgeon = page.getByRole('combobox', { name: 'Cirurgião', exact: true });
        const first = page.getByRole('combobox', { name: 'Médico auxiliar 1', exact: true });
        const selectAna = async (input: ReturnType<Page['getByRole']>) => {
          await input.fill('Ana');
          await page.getByRole('option', { name: 'Ana Hemodinks', exact: true }).click();
        };
        // Limpa o preenchimento automatico do medico, quando aplicavel.
        await surgeon.fill('');
        await surgeon.press('Tab');
        await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
        await expect(page.getByRole('alert')).toHaveText('Selecione um cirurgião ou ao menos um médico auxiliar.');
        expect(api.writes).toHaveLength(0);
        await selectAna(surgeon);
        await selectAna(first);
        await noOverflow(page);
        await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
        await expect(page.getByText('Paciente cadastrado com sucesso.', { exact: true })).toBeVisible();
        expect(api.writes[0]).toMatchObject({ medicoUserId: 1, medicoAuxiliar1UserId: 1 });
        await page.getByRole('button', { name: 'Editar Paciente Equipe 174', exact: true }).click();
        await expect(surgeon).toHaveValue('Ana Hemodinks');
        await expect(first).toHaveValue('Ana Hemodinks');
        await surgeon.fill('');
        await surgeon.press('Tab');
        await expect(first).toHaveValue('Ana Hemodinks');
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes[1]).toMatchObject({ medicoUserId: null, medico: '', medicoAuxiliar1UserId: 1 });
        await page.getByRole('button', { name: 'Editar Paciente Equipe 174', exact: true }).click();
        await expect(surgeon).toHaveValue('');
        await expect(first).toHaveValue('Ana Hemodinks');
        const bytes = await download(page, 'Exportar ficha Excel', 'xlsx', 'cadastro-paciente-');
        expect(bytes.toString()).toContain('Ana Hemodinks');
        await download(page, 'Exportar ficha PDF', 'pdf', 'cadastro-paciente-');
        await selectAna(surgeon);
        await first.fill('');
        await first.press('Tab');
        await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
        await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
        expect(api.writes[2]).toMatchObject({ medicoUserId: 1, medicoAuxiliar1UserId: null });
        expect(api.patients.filter((patient) => patient.nomePaciente === 'Paciente Equipe 174')).toHaveLength(1);
      });
    }

    test('cadastra com novos vínculos, edita sem duplicar, exporta a ficha e envia arquivo', async ({ page }) => {
      const base = await setup(page);
      const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
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
      const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
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
      const api = await mockPatientFormApi(page, base.pacientes[0], base.token);
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
