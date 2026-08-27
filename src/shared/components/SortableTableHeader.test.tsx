import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableTableHeader } from './SortableTableHeader';

describe('SortableTableHeader', () => {
  it('aplica aria-sort na célula de cabeçalho, não no botão', () => {
    render(<table><thead><tr>
      <SortableTableHeader field="nome" label="Nome" activeField="nome" direction="desc" onSortChange={vi.fn()} />
    </tr></thead></table>);

    expect(screen.getByRole('columnheader', { name: /nome/i })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('button', { name: /nome/i })).not.toHaveAttribute('aria-sort');
  });
});
