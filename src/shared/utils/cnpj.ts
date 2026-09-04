export const MAX_CNPJ_MASK_LENGTH = 18;

export function normalizeCnpj(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '').slice(0, 14);
}

export function formatCnpjInput(value: string | null | undefined) {
  const digits = normalizeCnpj(value);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function isValidCnpj(value: string | null | undefined) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calculateDigit = (length: 12 | 13) => {
    let weight = length - 7;
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cnpj[index]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12])
    && calculateDigit(13) === Number(cnpj[13]);
}

export function getCnpjValidationMessage(value: string | null | undefined) {
  if (!normalizeCnpj(value)) return 'Informe o CNPJ.';
  return isValidCnpj(value) ? '' : 'Informe um CNPJ válido.';
}
