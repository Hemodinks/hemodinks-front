import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CnpjField } from './CnpjField';

function FieldHarness() {
  const [value, setValue] = useState('');
  return <CnpjField value={value} onValueChange={setValue} />;
}

describe('CnpjField', () => {
  it('é obrigatório, aplica máscara e mostra erro de documento inválido', () => {
    render(<FieldHarness />);
    const input = screen.getByRole('textbox', { name: 'CNPJ' });
    expect(input).toBeRequired();

    fireEvent.change(input, { target: { value: '11222333000182' } });
    expect(input).toHaveValue('11.222.333/0001-82');
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um CNPJ válido.');
    expect(input).toBeInvalid();
  });

  it('aceita valor mascarado e remove o erro quando o CNPJ é válido', () => {
    render(<FieldHarness />);
    const input = screen.getByRole('textbox', { name: 'CNPJ' });

    fireEvent.change(input, { target: { value: '11.222.333/0001-81' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('11.222.333/0001-81');
    expect(input).toBeValid();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
