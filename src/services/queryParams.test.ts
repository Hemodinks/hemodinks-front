import { describe, expect, it } from 'vitest';
import type { PacienteListQuery } from '../types';
import { buildListQueryParams } from './queryParams';

describe('surgery type query contract', () => {
  it.each(['Eletiva', 'Urgencia'] as const)('serializes %s as its API string alongside existing filters', (tipoCirurgia) => {
    const query: PacienteListQuery = { tipoCirurgia, page: 2, medicoUserIds: '7,8', competenciaInicio: '2026-10' };
    expect(buildListQueryParams(query)?.toString()).toBe(
      `page=2&tipoCirurgia=${tipoCirurgia}&medicoUserIds=7%2C8&competenciaInicio=2026-10`,
    );
  });

  it.each([undefined, ''] as const)('omits the all-types filter %s', (tipoCirurgia) => {
    expect(buildListQueryParams({ tipoCirurgia })).toBeUndefined();
    expect(buildListQueryParams({ tipoCirurgia, page: 3 })?.toString()).toBe('page=3');
  });
});
