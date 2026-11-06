export type TipoCirurgia = 'EmAutorizacao' | 'Eletiva' | 'Urgencia';

export const SURGERY_TYPE_OPTIONS = [
  { value: 'EmAutorizacao', label: 'Em processo de autorização' },
  { value: 'Eletiva', label: 'Eletiva' },
  { value: 'Urgencia', label: 'Urgência' },
] as const;

export function getSurgeryTypeLabel(value?: TipoCirurgia | null): string {
  return SURGERY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Não informado';
}
