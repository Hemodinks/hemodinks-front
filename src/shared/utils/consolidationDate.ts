import { isValidDate, toDatePickerValue } from './formatters';

// Espelha DataConsolidacaoRules da API: o HemoDinks opera desde 2026 e o limite
// superior acompanha o ano corrente de Brasília (+1).
export const CONSOLIDATION_MIN_YEAR = 2026;

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getConsolidationMaxYear(now: Date = new Date()) {
  return new Date(now.getTime() - BRASILIA_OFFSET_MS).getUTCFullYear() + 1;
}

export function getConsolidationYearRangeMessage(maxYear = getConsolidationMaxYear()) {
  return `O ano da data da consolidação deve estar entre ${CONSOLIDATION_MIN_YEAR} e ${maxYear}.`;
}

/**
 * Data legada fora da faixa continua aceita enquanto não for alterada (pendência sinalizada no banner);
 * qualquer data nova ou alterada precisa respeitar a faixa.
 */
export function getConsolidationYearError(
  value: string | null | undefined,
  originalValue?: string | null,
  now: Date = new Date(),
) {
  if (!value || !isValidDate(value)) return '';
  if (originalValue && toDatePickerValue(originalValue) === toDatePickerValue(value)) return '';
  const year = Number(toDatePickerValue(value).slice(0, 4));
  const maxYear = getConsolidationMaxYear(now);
  return year < CONSOLIDATION_MIN_YEAR || year > maxYear ? getConsolidationYearRangeMessage(maxYear) : '';
}
