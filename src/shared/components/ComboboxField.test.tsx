import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ComboboxField } from './ComboboxField';

function ControlledCombobox(props?: Partial<ComponentProps<typeof ComboboxField>>) {
  const [value, setValue] = useState('');
  return (
    <ComboboxField
      label="Convênio"
      value={value}
      options={[' Bradesco Saúde ', 'Amil', 'amil', '']}
      onValueChange={setValue}
      {...props}
    />
  );
}

describe('ComboboxField', () => {
  it('filtra sem acentos, navega pelo teclado e seleciona a opção ativa', async () => {
    const user = userEvent.setup();
    render(<ControlledCombobox />);
    const input = screen.getByRole('combobox', { name: 'Convênio' });

    await user.type(input, 'saude');
    expect(screen.getByRole('option', { name: 'Bradesco Saúde' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Amil' })).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue('Bradesco Saúde');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('permite percorrer opções, fechar com Escape e selecionar com o mouse', async () => {
    const user = userEvent.setup();
    render(<ControlledCombobox />);
    const input = screen.getByRole('combobox', { name: 'Convênio' });

    await user.click(screen.getByRole('button', { name: 'Abrir opcoes de convênio' }));
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Bradesco Saúde' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir opcoes de convênio' }));
    await user.click(screen.getByRole('option', { name: /^Amil$/ }));
    expect(input).toHaveValue('Amil');
  });

  it('informa ausência de opções e respeita o estado desabilitado', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <ComboboxField
        label="Hospital"
        value="inexistente"
        options={['Mater Dei']}
        onValueChange={onValueChange}
        noOptionsLabel="Nenhum hospital."
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Hospital' }));
    expect(screen.getByText('Nenhum hospital.')).toBeInTheDocument();

    rerender(
      <ComboboxField
        label="Hospital"
        value=""
        options={['Mater Dei']}
        onValueChange={onValueChange}
        disabled
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Hospital' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Abrir opcoes de hospital' })).toBeDisabled();
  });
});
