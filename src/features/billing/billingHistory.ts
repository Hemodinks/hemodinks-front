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
