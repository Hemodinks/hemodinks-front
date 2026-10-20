import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { TipoCirurgia } from '../surgeryType';
import { SurgeryTypeField, SurgeryTypeFilter } from './SurgeryTypeField';

describe('tipo de cirurgia acessível', () => {
  it('mantém valor ausente e permite escolher uma única opção pelo teclado', async () => {
    function Form() {
      const [value, setValue] = useState<TipoCirurgia>();
      return <SurgeryTypeField value={value} onChange={setValue} />;
    }
    render(<Form />);
    const group = screen.getByRole('group', { name: 'Tipo de cirurgia' });
    expect(within(group).getByRole('radio', { name: 'Eletiva' })).not.toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Urgência' })).not.toBeChecked();
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('radio', { name: 'Eletiva' })).toBeChecked();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Urgência' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Eletiva' })).not.toBeChecked();
  });

  it('mantém nomes independentes para dois formulários e respeita disabled', () => {
    render(<><SurgeryTypeField value="Eletiva" onChange={() => {}} disabled /><SurgeryTypeField value="Urgencia" onChange={() => {}} /></>);
    const groups = screen.getAllByRole('group', { name: 'Tipo de cirurgia' });
    expect(within(groups[0]).getByLabelText('Eletiva')).toBeDisabled();
    expect(within(groups[0]).getByLabelText('Eletiva').getAttribute('name')).not.toBe(within(groups[1]).getByLabelText('Eletiva').getAttribute('name'));
  });

  it('filtra Eletiva, Urgência e volta a Todos', async () => {
    function Filter() {
      const [value, setValue] = useState<TipoCirurgia | ''>('');
      return <SurgeryTypeFilter value={value} onChange={setValue} />;
    }
    render(<Filter />);
    const select = screen.getByRole('combobox', { name: 'Tipo de cirurgia' });
    expect(select).toHaveValue('');
    await userEvent.selectOptions(select, 'Urgencia');
    expect(select).toHaveValue('Urgencia');
    await userEvent.selectOptions(select, 'Eletiva');
    expect(select).toHaveValue('Eletiva');
    await userEvent.selectOptions(select, '');
    expect(select).toHaveValue('');
  });
});
