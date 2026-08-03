import { MAX_CURRENCY_DIGITS } from './formatterConstants';
import { onlyDigits } from './identityFormatters';

export function formatCurrency(value?: number | null) {
  return typeof value === 'number'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '-';
}

export function formatCurrencyInput(value: string) {
  const digits = onlyDigits(value).slice(0, MAX_CURRENCY_DIGITS);
  if (!digits) return '';

  const padded = digits.padStart(3, '0');
  const cents = padded.slice(-2);
  const integerDigits = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const integerPart = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${integerPart},${cents}`;
}
