function onlyDateDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatDateInput(value: string) {
  const digits = onlyDateDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function toDisplayDate(value?: string | null) {
  if (!value) return '';
  if (value.includes('/')) return formatDateInput(value);
  const [year, month, day] = value.split('T')[0].split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

export function toNotificationDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? toDisplayDate(value)
    : new Intl.DateTimeFormat('pt-BR').format(date);
}

export function parseDisplayDate(value: string) {
  const [day, month, year] = value.split('/');
  return { day, month, year };
}

export function toDatePickerValue(value: string) {
  const { day, month, year } = parseDisplayDate(value);
  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function fromDatePickerValue(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

export function getTodayPickerValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidBirthDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const { day: dayText, month: monthText, year: yearText } = parseDisplayDate(value);
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return year >= 1900
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date <= today;
}
