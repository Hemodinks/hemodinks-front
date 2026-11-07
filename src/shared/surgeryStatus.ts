export type StatusCirurgia = 'Consolidada' | 'NaoConsolidada';

export const SURGERY_STATUS_OPTIONS = [
  { value: 'Consolidada', label: 'Consolidada', filterLabel: 'Consolidadas' },
  { value: 'NaoConsolidada', label: 'Não consolidada', filterLabel: 'Não consolidadas' },
] as const;

// Mesma regra da API (#245): data da consolidação preenchida → Consolidada; vazia → Não consolidada.
export function deriveSurgeryStatus(dataConsolidacao?: string | null): StatusCirurgia {
  return dataConsolidacao?.trim() ? 'Consolidada' : 'NaoConsolidada';
}

// A API é a fonte do status; a derivação só cobre respostas anteriores ao campo.
export function getSurgeryStatus(record: { statusCirurgia?: StatusCirurgia | null; dataAtendimento?: string | null }): StatusCirurgia {
  return record.statusCirurgia ?? deriveSurgeryStatus(record.dataAtendimento);
}

export function getSurgeryStatusLabel(value: StatusCirurgia): string {
  return SURGERY_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? 'Não consolidada';
}

export function matchesSurgeryStatus(
  record: { statusCirurgia?: StatusCirurgia | null; dataAtendimento?: string | null },
  filter?: StatusCirurgia | '',
): boolean {
  return !filter || getSurgeryStatus(record) === filter;
}
