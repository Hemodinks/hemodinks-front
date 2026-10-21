export type TipoCirurgia = 'Eletiva' | 'Urgencia';

export const SURGERY_TYPE_OPTIONS = [
  { value: 'Eletiva', label: 'Eletiva' },
  { value: 'Urgencia', label: 'Urgência' },
] as const;

export function getSurgeryTypeLabel(value?: TipoCirurgia | null): string {
  return SURGERY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Não informado';
}
