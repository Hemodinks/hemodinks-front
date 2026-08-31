import { describe, expect, it } from 'vitest';
import type { BillingRecord } from './billingTypes';
import { buildBillingHistory, getBillingHistoryMonthTone, getBillingQuarterHighlights, getBillingQuarterPerformanceTone } from './billingHistory';

function record(id: number, attendanceDate: string | null, paymentAmount: number): BillingRecord {
  return {
    id,
    attendanceDate,
    competenciaInicio: '2030-12-01T00:00:00Z',
    competenciaFinal: '2030-12-31T00:00:00Z',
    paymentDate: null,
    surgeryDate: null,
    paymentAmount,
    glosaAmount: 0,
    netAmount: paymentAmount,
    status: 'paid',
    regime: 'convenio',
    authorizationCode: '',
    hasOpme: false,
    filesCount: 0,
    pendingChecklistItems: 0,
    paymentHasNumericValue: true,
    paymentRaw: String(paymentAmount),
    glosaHasNumericValue: true,
    glosaRaw: '0',
  } as BillingRecord;
}

describe('histórico de faturamento', () => {
  it('agrupa exclusivamente pela data do atendimento e oferece os doze meses', () => {
    const history = buildBillingHistory([
      record(1, '2025-01-10T00:00:00Z', 100),
      record(2, '2026-06-15T00:00:00Z', 250),
      record(3, '2026-06-20T00:00:00Z', 150),
    ]);

    expect(history.years.map((group) => group.year)).toEqual([2026, 2025]);
    expect(history.years[0].months).toHaveLength(12);
    expect(history.years[0].months.map((month) => month.name)).toEqual([
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ]);
    expect(history.years[0].summary.totalGrossAmount).toBe(400);
    expect(history.years[0].months[5].records.map((item) => item.id)).toEqual([3, 2]);
    expect(history.years[0].months[5].summary.totalGrossAmount).toBe(400);
  });

  it('separa registros sem data de atendimento válida', () => {
    const invalidRecord = record(1, null, 100);
    const history = buildBillingHistory([invalidRecord]);

    expect(history.years).toHaveLength(0);
    expect(history.recordsWithoutAttendanceDate).toEqual([invalidRecord]);
  });

  it('identifica o maior e o menor faturamento de cada trimestre', () => {
    const history = buildBillingHistory([
      record(1, '2026-01-10T00:00:00Z', 100),
      record(2, '2026-02-10T00:00:00Z', 300),
      record(3, '2026-03-10T00:00:00Z', 200),
      record(4, '2026-04-10T00:00:00Z', 50),
    ]);
    const highlights = getBillingQuarterHighlights(history.years[0]);

    expect(highlights[0].highestMonth.name).toBe('Fevereiro');
    expect(highlights[0].lowestMonth.name).toBe('Janeiro');
    expect(highlights[0].totalGrossAmount).toBe(600);
    expect(getBillingHistoryMonthTone(2, highlights)).toBe('highest');
    expect(getBillingHistoryMonthTone(1, highlights)).toBe('lowest');
    expect(getBillingHistoryMonthTone(3, highlights)).toBe('neutral');
  });

  it('mantém destaques distintos quando os valores do trimestre empatam', () => {
    const history = buildBillingHistory([record(1, '2026-04-10T00:00:00Z', 50)]);
    const highlights = getBillingQuarterHighlights(history.years[0]);

    expect(highlights[0].highestMonth.month).not.toBe(highlights[0].lowestMonth.month);
  });

  it('destaca os dois trimestres mais lucrativos e os dois menos lucrativos', () => {
    const history = buildBillingHistory([
      record(1, '2026-01-10T00:00:00Z', 100),
      record(2, '2026-04-10T00:00:00Z', 400),
      record(3, '2026-07-10T00:00:00Z', 300),
      record(4, '2026-10-10T00:00:00Z', 200),
    ]);
    const highlights = getBillingQuarterHighlights(history.years[0]);

    expect(highlights.map((quarter) => getBillingQuarterPerformanceTone(quarter.quarter, highlights))).toEqual([
      'least-profitable',
      'most-profitable',
      'most-profitable',
      'least-profitable',
    ]);
  });

  it('mantém trimestres e meses zerados ou empatados com destaque neutro', () => {
    const history = buildBillingHistory([
      record(1, '2026-07-10T00:00:00Z', 300),
      record(2, '2026-08-10T00:00:00Z', 300),
    ]);
    const highlights = getBillingQuarterHighlights(history.years[0]);

    expect(highlights.map((quarter) => getBillingQuarterPerformanceTone(quarter.quarter, highlights))).toEqual([
      'neutral', 'neutral', 'most-profitable', 'neutral',
    ]);
    expect(getBillingHistoryMonthTone(7, highlights)).toBe('neutral');
    expect(getBillingHistoryMonthTone(8, highlights)).toBe('neutral');
    expect(getBillingHistoryMonthTone(9, highlights)).toBe('neutral');
  });
});
