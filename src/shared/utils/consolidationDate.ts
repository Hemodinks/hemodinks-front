import { isValidDate, toDatePickerValue } from './formatters';

// Espelha DataConsolidacaoRules da API: ano mínimo 2025 (regra de negócio) e limite
// superior acompanhando o ano corrente de Brasília (+1).
export const CONSOLIDATION_MIN_YEAR = 2025;

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getConsolidationMaxYear(now: Date = new Date()) {
  return new Date(now.getTime() - BRASILIA_OFFSET_MS).getUTCFullYear() + 1;
}

export function getConsolidationYearRangeMessage(maxYear = getConsolidationMaxYear()) {
  return `O ano da data da consolidação deve estar entre ${CONSOLIDATION_MIN_YEAR} e ${maxYear}.`;
}

// Mesmo texto da API (DataConsolidacaoRules.MensagemApagarProibido): exibido em toast.
export const CONSOLIDATION_CLEAR_FORBIDDEN_PREFIX = 'Não é permitido apagar a data de uma cirurgia já consolidada.';

// Cadastro pendente (ano fora da faixa) recebe também a orientação de correção do ano.
export function getConsolidationClearForbiddenMessage(pending: boolean, maxYear = getConsolidationMaxYear()) {
  return pending
    ? `${CONSOLIDATION_CLEAR_FORBIDDEN_PREFIX} Corrija o ano da data da consolidação para um valor entre ${CONSOLIDATION_MIN_YEAR} e ${maxYear}.`
    : CONSOLIDATION_CLEAR_FORBIDDEN_PREFIX;
}

export function isConsolidationClearForbiddenMessage(message: string | null | undefined) {
  return Boolean(message?.startsWith(CONSOLIDATION_CLEAR_FORBIDDEN_PREFIX));
}

function isOutOfRange(value: string, maxYear: number) {
  const year = Number(toDatePickerValue(value).slice(0, 4));
  return year < CONSOLIDATION_MIN_YEAR || year > maxYear;
}

/**
 * Data legada fora da faixa continua aceita enquanto não for alterada (pendência sinalizada no banner);
 * qualquer data nova ou alterada precisa respeitar a faixa. Cirurgia já consolidada (com data) nunca pode
 * ter a data apagada, para não mascarar o faturamento; só cadastros que nunca tiveram data ficam sem data.
 */
export function getConsolidationYearError(
  value: string | null | undefined,
  originalValue?: string | null,
  now: Date = new Date(),
) {
  const maxYear = getConsolidationMaxYear(now);
  if (!value?.trim()) {
    return originalValue && isValidDate(originalValue)
      ? getConsolidationClearForbiddenMessage(isOutOfRange(originalValue, maxYear), maxYear) : '';
  }
  if (!isValidDate(value)) return '';
  if (originalValue && toDatePickerValue(originalValue) === toDatePickerValue(value)) return '';
  return isOutOfRange(value, maxYear) ? getConsolidationYearRangeMessage(maxYear) : '';
}
