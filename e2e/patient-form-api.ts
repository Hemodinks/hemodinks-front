import { expect, type Page } from '@playwright/test';

type RecordData = Record<string, any>;

// Stateful API contract fixture. Creation of lookup records remains a backend responsibility.
export async function mockPatientFormApi(page: Page, initialPatient: RecordData) {
  const state = {
    patients: [{ ...initialPatient, pagamento: '0', statusPago: false }],
    hospitals: [{ id: 1, nome: 'Santa Clara - Mater Dei' }],
    agreements: [{ idConvenio: 7, descricaoConvenio: 'Particular' }],
    suppliers: [{ idFornecedor: 1, fornecedor: 'Promedom' }],
    writes: [] as RecordData[],
    queries: [] as URLSearchParams[],
    uploads: [] as string[],
    failUpload: false,
    failSave: false,
    failDelete: false,
    deleteDelay: 0,
    deleteRequests: 0,
  };
  const paged = (items: RecordData[]) => ({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 });
  const resolveLookup = (items: RecordData[], idKey: string, nameKey: string, value: string) => {
    const existing = items.find((item) => String(item[nameKey]).trim().toLocaleLowerCase('pt-BR') === value.trim().toLocaleLowerCase('pt-BR'));
    if (existing) return existing[idKey];
    if (!value.trim()) return null;
    const id = 100 + items.length;
    items.push({ [idKey]: id, [nameKey]: value.trim() });
    return id;
  };
  for (const [path, items] of [
    ['hospitais', state.hospitals], ['convenios', state.agreements], ['opme', state.suppliers],
  ] as const) {
    await page.route(`http://localhost:5000/api/${path}/`, (route) => route.fulfill({ json: items }));
  }
  await page.route('http://localhost:5000/api/pacientes/**', async (route) => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer jwt-token');
    const url = new URL(request.url());
    const method = request.method();
    const idMatch = url.pathname.match(/\/pacientes\/(\d+)/);
    const id = idMatch ? Number(idMatch[1]) : null;
    if (url.pathname.endsWith('/observacoes')) return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/arquivos') && method === 'POST') {
      if (state.failUpload) return route.fulfill({ status: 400, json: { message: 'Não foi possível enviar o arquivo de teste.' } });
      const body = request.postDataBuffer()?.toString() ?? '';
      state.uploads.push(body);
      const fileName = body.match(/filename="([^"]+)"/)?.[1] ?? 'documento.txt';
      const file = { id: 50, nomeOriginal: fileName, contentType: 'text/plain', tamanhoBytes: 20 };
      const patient = state.patients.find((item) => item.id === id)!;
      patient.arquivos = [...patient.arquivos, file];
      patient.arquivosCount = patient.arquivos.length;
      return route.fulfill({ json: file });
    }
    if (method === 'POST' || method === 'PUT') {
      const payload = request.postDataJSON();
      state.writes.push(payload);
      expect(payload).not.toHaveProperty('clinicaId');
      if (state.failSave) return route.fulfill({ status: 400, json: { message: 'Não foi possível salvar o paciente de teste.' } });
      const saved = {
        ...initialPatient, ...payload, id: id ?? 10 + state.patients.length,
        hospitalId: payload.hospitalId ?? resolveLookup(state.hospitals, 'id', 'nome', payload.hospital ?? ''),
        convenioId: payload.convenioId ?? resolveLookup(state.agreements, 'idConvenio', 'descricaoConvenio', payload.convenio ?? ''),
        opmeFornecedorId: payload.opmeFornecedorId ?? resolveLookup(state.suppliers, 'idFornecedor', 'fornecedor', payload.opmeFornecedor ?? ''),
        arquivos: state.patients.find((item) => item.id === id)?.arquivos ?? [],
      };
      state.patients = id ? state.patients.map((item) => item.id === id ? saved : item) : [...state.patients, saved];
      return route.fulfill({ json: saved });
    }
    if (method === 'DELETE') {
      state.deleteRequests += 1;
      if (state.deleteDelay) await new Promise((resolve) => setTimeout(resolve, state.deleteDelay));
      if (state.failDelete) return route.fulfill({ status: 400, json: { message: 'Não foi possível excluir o paciente de teste.' } });
      state.patients = state.patients.filter((item) => item.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }
    if (id) return route.fulfill({ json: state.patients.find((item) => item.id === id) });
    state.queries.push(url.searchParams);
    const procedure = url.searchParams.get('procedimento')?.toLowerCase();
    const search = url.searchParams.get('search')?.toLowerCase();
    const items = state.patients.filter((item) => (!procedure || String(item.procedimento).toLowerCase().includes(procedure))
      && (!search || String(item.nomePaciente).toLowerCase().includes(search)));
    const currentPage = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('pageSize') || 10);
    return route.fulfill({ json: { ...paged(items.slice((currentPage - 1) * pageSize, currentPage * pageSize)),
      page: currentPage, pageSize, totalItems: items.length, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) } });
  });
  return state;
}
