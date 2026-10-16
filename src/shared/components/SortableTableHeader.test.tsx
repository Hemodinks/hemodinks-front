import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableTableHeader } from './SortableTableHeader';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';

describe('SortableTableHeader', () => {
  it('ordena com Enter e Espaço e anuncia a direção no cabeçalho', async () => {
    const changed = vi.fn();
    function Table() {
      const [active, setActive] = useState('');
      const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
      return <table><thead><tr><SortableTableHeader field="nome" label="Nome" activeField={active} direction={direction}
        onSortChange={field => {
          changed(field);
          setDirection(active === field && direction === 'asc' ? 'desc' : 'asc');
          setActive(field);
        }} /></tr></thead></table>;
    }
    const user = userEvent.setup();
    render(<Table />);
    const header = screen.getByRole('columnheader', { name: 'Nome' });
    const button = screen.getByRole('button', { name: 'Nome' });
    expect(header).toHaveAttribute('aria-sort', 'none');
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    await user.keyboard(' ');
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(changed).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenNthCalledWith(1, 'nome');
    expect(changed).toHaveBeenNthCalledWith(2, 'nome');
    expect(button).not.toHaveAttribute('aria-sort');
    expect(button).toHaveFocus();
  });
  it('aplica aria-sort na célula de cabeçalho, não no botão', () => {
    render(<table><thead><tr>
      <SortableTableHeader field="nome" label="Nome" activeField="nome" direction="desc" onSortChange={vi.fn()} />
    </tr></thead></table>);

    expect(screen.getByRole('columnheader', { name: /nome/i })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('button', { name: /nome/i })).not.toHaveAttribute('aria-sort');
  });
});
