import { describe, expect, it } from 'vitest';
import { getSurgeryTypeLabel, SURGERY_TYPE_OPTIONS } from './surgeryType';

describe('surgery type presentation', () => {
  it('keeps API enum values while presenting Portuguese labels', () => {
    expect(SURGERY_TYPE_OPTIONS).toEqual([
      { value: 'Eletiva', label: 'Eletiva' },
      { value: 'Urgencia', label: 'Urgência' },
    ]);
    expect(getSurgeryTypeLabel('Eletiva')).toBe('Eletiva');
    expect(getSurgeryTypeLabel('Urgencia')).toBe('Urgência');
  });

  it('does not classify missing legacy data as elective surgery', () => {
    expect(getSurgeryTypeLabel()).toBe('Não informado');
    expect(getSurgeryTypeLabel(null)).toBe('Não informado');
  });
});
