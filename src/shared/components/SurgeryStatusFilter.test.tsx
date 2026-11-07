import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StatusCirurgia } from '../surgeryStatus';
import { SurgeryStatusFilter } from './SurgeryStatusFilter';

describe('filtro de status da cirurgia', () => {
  it('começa em Todas e alterna entre Consolidadas e Não consolidadas', async () => {
    function Filter() {
      const [value, setValue] = useState<StatusCirurgia | ''>('');
      return <SurgeryStatusFilter value={value} onChange={setValue} />;
    }
    render(<Filter />);
    const select = screen.getByRole('combobox', { name: 'Status da cirurgia' });
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Todas' })).toBeInTheDocument();
    await userEvent.selectOptions(select, 'Consolidadas');
    expect(select).toHaveValue('Consolidada');
    await userEvent.selectOptions(select, 'Não consolidadas');
    expect(select).toHaveValue('NaoConsolidada');
    await userEvent.selectOptions(select, 'Todas');
    expect(select).toHaveValue('');
  });
});
