import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { focusFirstInvalidFormField } from './focusInvalidFormField';

describe('focusFirstInvalidFormField', () => {
  it('foca e centraliza o primeiro campo invalido do formulario', async () => {
    render(<form onInvalid={focusFirstInvalidFormField}>
      <label>Nome obrigatório<input aria-label="Nome obrigatório" required /></label>
      <label>Email obrigatório<input aria-label="Email obrigatório" required /></label>
    </form>);
    const nameInput = screen.getByRole('textbox', { name: 'Nome obrigatório' });
    const emailInput = screen.getByRole('textbox', { name: 'Email obrigatório' });
    const scrollIntoView = vi.fn();
    nameInput.scrollIntoView = scrollIntoView;
    emailInput.scrollIntoView = vi.fn();

    fireEvent.invalid(nameInput);
    fireEvent.invalid(emailInput);

    await waitFor(() => expect(nameInput).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
      inline: 'nearest',
    });
    expect(emailInput.scrollIntoView).not.toHaveBeenCalled();
  });
});
