import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ComboboxField } from './ui';

function setup(disabled = false) {
  const changed = vi.fn();
  function Field() {
    const [value, setValue] = useState('');
    return <ComboboxField label="Hospital" value={value} options={['Água', 'Beta', 'Beta', '']} disabled={disabled}
      onValueChange={next => { changed(next); setValue(next); }} />;
  }
  render(<Field />);
  return { user: userEvent.setup(), input: screen.getByRole('combobox', { name: 'Hospital' }), changed };
}

describe('ComboboxField', () => {
  it('anuncia uma opção existente ao navegar com setas e seleciona com Enter', async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const first = screen.getByRole('option', { name: 'Água' });
    expect(first.id).not.toBe('');
    expect(input).toHaveAttribute('aria-activedescendant', first.id);
    expect(document.getElementById(input.getAttribute('aria-activedescendant')!)).toBe(first);
    await user.keyboard('{ArrowUp}');
    const last = screen.getByRole('option', { name: 'Beta' });
    expect(last.id).not.toBe('');
    expect(input).toHaveAttribute('aria-activedescendant', last.id);
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('Beta');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it.each(['{Enter}', ' '])('seleciona opção focada com %s uma única vez', async key => {
    const { user, input, changed } = setup();
    await user.click(input);
    await user.tab(); // Acionador de abertura.
    await user.tab(); // Primeira opção.
    expect(screen.getByRole('option', { name: 'Água' })).toHaveFocus();
    await user.keyboard(key);
    expect(input).toHaveValue('Água');
    expect(changed).toHaveBeenCalledExactlyOnceWith('Água');
    expect(input).toHaveFocus();
  });

  it('preserva seleção por mouse sem duplicar callbacks ou opções', async () => {
    const { user, input, changed } = setup();
    await user.click(input);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.click(screen.getByRole('option', { name: 'Beta' }));
    expect(input).toHaveValue('Beta');
    expect(changed).toHaveBeenCalledExactlyOnceWith('Beta');
  });

  it('preserva texto livre e fecha por Escape sem selecionar', async () => {
    const { user, input } = setup();
    await user.type(input, 'Hospital livre');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('Hospital livre');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('mantém input e acionador desabilitados', async () => {
    const { user, input, changed } = setup(true);
    expect(input).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
    await user.click(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });
});
