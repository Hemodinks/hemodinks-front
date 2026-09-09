import { describe, expect, it } from 'vitest';
import type { BillingRecord } from './billingUtils';
import { getBillingPage, parseBillingDetailId, sortBillingRecords } from './billingPageUtils';
import { basePaciente } from '../../test/appTestData';

function record(id: number, patientName: string, doctorName: string, statusLabel: string) {
  return { id, patientName, doctorName, statusLabel } as BillingRecord;
}

describe('billingPageUtils', () => {
  it.each(['paymentDate', 'attendanceDate', 'requestDate'] as const)('ordena %s cronologicamente antes de paginar, com datas vazias no fim', (sortBy) => {
    const records = ['2030-12-01', null, '2026-12-31', '2027-01-02'].map((date, index) => ({
      ...record(index + 1, `Paciente ${index}`, 'Medico', 'Pago'),
      paymentDate: date, attendanceDate: date, paciente: { ...basePaciente, data: date },
    }));
    expect(sortBillingRecords(records, { sortBy, sortDirection: 'desc' }).map((item) => item.id)).toEqual([1, 4, 3, 2]);
    expect(sortBillingRecords(records, { sortBy, sortDirection: 'asc' }).map((item) => item.id)).toEqual([3, 4, 1, 2]);
    expect(getBillingPage(records, { sortBy, sortDirection: 'asc', currentPage: 2, pageSize: 2 }).records.map((item) => item.id)).toEqual([1, 2]);
  });

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
