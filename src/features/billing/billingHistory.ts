import type { BillingRecord, BillingSummary } from './billingTypes';
import { summarizeBillingRecords } from './billingUtils';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export type BillingHistoryMonth = {
  month: number;
  name: string;
  records: BillingRecord[];
  summary: BillingSummary;
};

export type BillingHistoryYear = {
  year: number;
  records: BillingRecord[];
  summary: BillingSummary;
  months: BillingHistoryMonth[];
};

export type BillingQuarterHighlight = {
  quarter: number;
  months: BillingHistoryMonth[];
  highestMonth: BillingHistoryMonth;
  lowestMonth: BillingHistoryMonth;
  totalGrossAmount: number;
};

export type BillingHistoryMonthTone = 'highest' | 'lowest' | 'neutral';
export type BillingQuarterPerformanceTone = 'most-profitable' | 'least-profitable' | 'neutral';

export function getBillingHistoryDate(record: BillingRecord) {
  return record.attendanceDate;
}

function getYearAndMonth(record: BillingRecord) {
  const value = getBillingHistoryDate(record);
  const match = value?.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;

  return { year, month };
}

export function buildBillingHistory(records: BillingRecord[]) {
  const recordsByYear = new Map<number, BillingRecord[]>();
  const recordsWithoutAttendanceDate: BillingRecord[] = [];

  records.forEach((record) => {
    const period = getYearAndMonth(record);
    if (!period) {
      recordsWithoutAttendanceDate.push(record);
      return;
    }

    const yearRecords = recordsByYear.get(period.year) ?? [];
    yearRecords.push(record);
    recordsByYear.set(period.year, yearRecords);
  });

  const years = [...recordsByYear.entries()]
    .sort(([left], [right]) => right - left)
    .map<BillingHistoryYear>(([year, yearRecords]) => ({
      year,
      records: yearRecords,
      summary: summarizeBillingRecords(yearRecords),
      months: MONTH_NAMES.map((name, index) => {
        const month = index + 1;
        const monthRecords = yearRecords
          .filter((record) => getYearAndMonth(record)?.month === month)
          .sort((left, right) => (getBillingHistoryDate(right) ?? '').localeCompare(getBillingHistoryDate(left) ?? ''));

        return {
          month,
          name,
          records: monthRecords,
          summary: summarizeBillingRecords(monthRecords),
        };
      }),
    }));

  return { years, recordsWithoutAttendanceDate };
}

export function getBillingQuarterHighlights(year: BillingHistoryYear): BillingQuarterHighlight[] {
  return [0, 1, 2, 3].map((quarterIndex) => {
    const months = year.months.slice(quarterIndex * 3, quarterIndex * 3 + 3);
    const highestMonth = months.reduce((highest, month) => (
      month.summary.totalGrossAmount > highest.summary.totalGrossAmount
      || (month.summary.totalGrossAmount === highest.summary.totalGrossAmount
        && month.summary.totalRecords > highest.summary.totalRecords)
        ? month
        : highest
    ));
    const lowestMonth = months
      .filter((month) => month.month !== highestMonth.month)
      .reduce((lowest, month) => (
        month.summary.totalGrossAmount < lowest.summary.totalGrossAmount
        || (month.summary.totalGrossAmount === lowest.summary.totalGrossAmount
          && month.summary.totalRecords < lowest.summary.totalRecords)
          ? month
          : lowest
      ));

    return {
      quarter: quarterIndex + 1,
      months,
      highestMonth,
      lowestMonth,
      totalGrossAmount: months.reduce((total, month) => total + month.summary.totalGrossAmount, 0),
    };
  });
}

export function getBillingHistoryMonthTone(
  month: number,
  highlights: BillingQuarterHighlight[],
): BillingHistoryMonthTone {
  const quarter = highlights.find((item) => item.months.some((itemMonth) => itemMonth.month === month));
  if (quarter?.highestMonth.month === month) return 'highest';
  if (quarter?.lowestMonth.month === month) return 'lowest';
  return 'neutral';
}

export function getBillingQuarterPerformanceTone(
  quarter: number,
  highlights: BillingQuarterHighlight[],
): BillingQuarterPerformanceTone {
  const rankedQuarters = [...highlights].sort((left, right) => {
    const grossDifference = right.totalGrossAmount - left.totalGrossAmount;
    if (grossDifference !== 0) return grossDifference;

    const rightRecords = right.months.reduce((total, month) => total + month.summary.totalRecords, 0);
    const leftRecords = left.months.reduce((total, month) => total + month.summary.totalRecords, 0);
    return rightRecords - leftRecords || left.quarter - right.quarter;
  });
  const twoMostProfitable = new Set(rankedQuarters.slice(0, 2).map((item) => item.quarter));
  const twoLeastProfitable = new Set(rankedQuarters.slice(2, 4).map((item) => item.quarter));

  if (twoMostProfitable.has(quarter)) return 'most-profitable';
  if (twoLeastProfitable.has(quarter)) return 'least-profitable';
  return 'neutral';
}
