import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComboboxField, SearchField } from './ui';
import { MAX_NAME_LENGTH, MAX_SEARCH_LENGTH } from '../utils/formatterConstants';

// #289: campos digitáveis compartilhados têm limite padrão alinhado ao banco, sobrescrevível pelo chamador.
describe('limites padrão dos campos compartilhados', () => {
  it('SearchField limita a busca e aceita outro limite', () => {
    const { rerender } = render(<SearchField label="Buscar" value="" onValueChange={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveAttribute('maxLength', String(MAX_SEARCH_LENGTH));
    rerender(<SearchField label="Buscar" value="" onValueChange={vi.fn()} maxLength={20} />);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveAttribute('maxLength', '20');
  });

  it('ComboboxField limita ao tamanho de nome do banco e aceita outro limite', () => {
    const { rerender } = render(<ComboboxField label="Cirurgião" value="" options={[]} onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Cirurgião' })).toHaveAttribute('maxLength', String(MAX_NAME_LENGTH));
    rerender(<ComboboxField label="Cirurgião" value="" options={[]} onValueChange={vi.fn()} maxLength={1000} />);
    expect(screen.getByRole('combobox', { name: 'Cirurgião' })).toHaveAttribute('maxLength', '1000');
  });
});
