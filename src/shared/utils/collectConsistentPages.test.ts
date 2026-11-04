import { expect, it, vi } from 'vitest';
import { paged } from '../../test/appTestData';
import { collectConsistentPages } from './collectConsistentPages';

it.each([0, 1])('aceita consulta vazia com totalPages=%i', async totalPages => {
  expect(await collectConsistentPages(async () => ({ ...paged([]), totalPages }))).toEqual([]);
});
it.each([
  { page: 2 }, { totalItems: -1 }, { pageSize: 0 }, { totalPages: 2 },
  { items: [{ id: 0 }] }, { items: [{ id: 1 }, { id: 1 }], totalItems: 2 },
])('rejeita metadados e identificadores inválidos: %j', async override => {
  await expect(collectConsistentPages(async () => ({ ...paged([{ id: 1 }]), ...override })))
    .rejects.toThrow(/consulta.*atualiz|dados.*mudaram/i);
});
it('para antes da próxima página se sessão ou consulta mudar', async () => {
  let current = true;
  const load = vi.fn(async () => { current = false; return paged([{ id: 1 }], 1, 1, 2); });
  await expect(collectConsistentPages(load, () => current)).rejects.toThrow(/consulta/);
  expect(load).toHaveBeenCalledTimes(1);
});
