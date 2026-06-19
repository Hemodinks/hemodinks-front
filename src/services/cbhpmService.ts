import type { CbhpmGeral, CbhpmListQuery, PagedResult } from '../types';
import { get } from './api';
import { buildListQueryParams } from './queryParams';

export function getCbhpmGeral(token: string, query?: CbhpmListQuery) {
  return get<PagedResult<CbhpmGeral>>('/api/cbhpm/', token, {
    params: buildListQueryParams(query),
  });
}

export async function getAllCbhpmGeral(token: string, pageSize = 100) {
  const firstResult = await getCbhpmGeral(token, { page: 1, pageSize });
  const items = [...firstResult.items];

  for (let page = 2; page <= firstResult.totalPages; page += 1) {
    const result = await getCbhpmGeral(token, { page, pageSize });
    items.push(...result.items);
  }

  return items;
}
