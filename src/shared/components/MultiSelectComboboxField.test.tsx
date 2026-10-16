import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelectComboboxField } from './ui';

function setup(initial: string[] = [], disabled = false) {
  const changed = vi.fn();
  function Field() {
    const [values, setValues] = useState(initial);
    return <MultiSelectComboboxField label="Hospitais" values={values} disabled={disabled}
      options={[{ value: 'a', label: 'Água' }, { value: 'b', label: 'Beta' }]}
      onValuesChange={next => { changed(next); setValues(next); }} />;
  }
  render(<Field />);
  return { user: userEvent.setup(), input: screen.getByRole('combobox', { name: 'Hospitais' }), changed };
}

function activeOption(input: HTMLElement) {
  const id = input.getAttribute('aria-activedescendant');
  expect(id).toBeTruthy();
  const option = document.getElementById(id!);
  expect(option).toHaveAttribute('role', 'option');
  return option!;
}

describe('MultiSelectComboboxField', () => {
  it('Todos limpa por teclado sem perder o foco nem manter opção ativa inexistente', async () => {
    const { user, input, changed } = setup(['a']);
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toBe(screen.getByRole('option', { name: 'Todos' }));
    await user.keyboard('{Enter}');
    expect(changed).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('button', { name: 'Remover Água' })).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('anuncia opções existentes com setas e alterna a opção ativa por Enter', async () => {
    const { user, input, changed } = setup();
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    activeOption(input);
    await user.keyboard('{ArrowUp}');
    activeOption(input);
    // A busca deixa uma opção de dados; setas devem alcançar essa opção além de Todos.
    await user.type(input, 'Beta');
    await user.keyboard('{ArrowDown}');
    if (activeOption(input).textContent === 'Todos') await user.keyboard('{ArrowDown}');
    expect(activeOption(input)).toBe(screen.getByRole('option', { name: 'Beta' }));
    await user.keyboard('{Enter}');
    expect(changed).toHaveBeenLastCalledWith(['b']);
    expect(screen.getByRole('button', { name: 'Remover Beta' })).toBeVisible();
    await user.type(input, 'Beta');
    await user.keyboard('{ArrowDown}');
    if (activeOption(input).textContent === 'Todos') await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(changed).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('button', { name: 'Remover Beta' })).not.toBeInTheDocument();
  });

  it('preserva mouse, chips, remoção e Todos limpa a seleção', async () => {
    const { user, input, changed } = setup();
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Água' }));
    expect(changed).toHaveBeenCalledExactlyOnceWith(['a']);
    await user.click(screen.getByRole('option', { name: 'Beta' }));
    expect(screen.getByRole('button', { name: 'Remover Água' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Remover Água' }));
    expect(changed).toHaveBeenLastCalledWith(['b']);
    await user.click(screen.getByRole('option', { name: 'Todos' }));
    expect(changed).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Escape fecha e limpa busca preservando chips; Backspace remove último', async () => {
    const { user, input, changed } = setup(['a', 'b']);
    await user.type(input, 'busca');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover Água' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remover Beta' })).toBeVisible();
    expect(changed).not.toHaveBeenCalled();
    await user.keyboard('{Backspace}');
    expect(changed).toHaveBeenLastCalledWith(['a']);
  });

  it('desabilita busca, acionador e remoção de chips', async () => {
    const { user, input, changed } = setup(['a'], true);
    expect(input).toBeDisabled();
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remover Água' }));
    expect(changed).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
