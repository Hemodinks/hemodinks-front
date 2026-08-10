import { describe, expect, it } from 'vitest';
import type { BillingRecord } from './billingUtils';
import { getBillingPage, parseBillingDetailId } from './billingPageUtils';

function record(id: number, patientName: string, doctorName: string, statusLabel: string) {
  return { id, patientName, doctorName, statusLabel } as BillingRecord;
}

describe('billingPageUtils', () => {
  it('ordena antes de paginar e limita a pagina atual ao total disponível', () => {
    const result = getBillingPage([
      record(1, 'Carlos', 'Dra. Bia', 'Pendente'),
      record(2, 'Ana', 'Dr. Caio', 'Pago'),
      record(3, 'Bruno', 'Dra. Ana', 'Pago'),
    ], {
      currentPage: 99,
      pageSize: 2,
      sortBy: 'patient',
      sortDirection: 'asc',
    });

    expect(result.totalPages).toBe(2);
    expect(result.visiblePage).toBe(2);
    expect(result.records.map((item) => item.patientName)).toEqual(['Carlos']);
    expect(result.visibleStart).toBe(3);
    expect(result.visibleEnd).toBe(3);
  });

  it('rejeita identificadores de detalhe inválidos', () => {
    expect(parseBillingDetailId('10')).toBe(10);
    expect(parseBillingDetailId('0')).toBeNull();
    expect(parseBillingDetailId('1.5')).toBeNull();
    expect(parseBillingDetailId('texto')).toBeNull();
  });
});
