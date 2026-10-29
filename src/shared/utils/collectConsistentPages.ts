import type { PagedResult } from '../../types';

export const CONSULTATION_CHANGED_MESSAGE = 'Os dados da consulta mudaram durante o carregamento. Atualize a consulta e tente novamente.';

// Offset pagination has no server snapshot/version. Reject observable drift instead
// of deduplicating it silently: a duplicate can also mean another record was omitted.
export async function collectConsistentPages<T extends { id: number }>(
  loadPage: (page: number) => Promise<PagedResult<T>>,
  shouldContinue: () => boolean = () => true,
): Promise<T[]> {
  const items: T[] = [];
  const ids = new Set<number>();
  let expected: Pick<PagedResult<T>, 'totalItems' | 'totalPages' | 'pageSize'> | undefined;
  for (let page = 1; page <= (expected?.totalPages ?? 1); page++) {
    if (!shouldContinue()) throw new Error(CONSULTATION_CHANGED_MESSAGE);
    const response = await loadPage(page);
    if (!shouldContinue()) throw new Error(CONSULTATION_CHANGED_MESSAGE);
    if (!response || !Array.isArray(response.items)) throw new Error(CONSULTATION_CHANGED_MESSAGE);
    const totalPages = Math.max(1, response.totalPages);
    if (!Array.isArray(response.items) || response.page !== page
      || !Number.isSafeInteger(response.totalItems) || response.totalItems < 0
      || !Number.isSafeInteger(response.pageSize) || response.pageSize < 1
      || !Number.isSafeInteger(response.totalPages) || response.totalPages < 0
      || totalPages !== Math.max(1, Math.ceil(response.totalItems / response.pageSize))
      || response.items.length > response.pageSize
      || (expected && (expected.totalItems !== response.totalItems || expected.totalPages !== totalPages || expected.pageSize !== response.pageSize))) {
      throw new Error(CONSULTATION_CHANGED_MESSAGE);
    }
    expected ??= { totalItems: response.totalItems, totalPages, pageSize: response.pageSize };
    for (const item of response.items) {
      if (!Number.isSafeInteger(item.id) || item.id <= 0 || ids.has(item.id)) throw new Error(CONSULTATION_CHANGED_MESSAGE);
      ids.add(item.id);
      items.push(item);
    }
    if (page < totalPages && response.items.length !== response.pageSize) throw new Error(CONSULTATION_CHANGED_MESSAGE);
  }
  if (items.length !== expected?.totalItems) throw new Error(CONSULTATION_CHANGED_MESSAGE);
  return items;
}
