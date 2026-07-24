import { fireEvent, render, screen } from '@testing-library/react';
import { Pencil } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Button, IconButton } from './ui';

describe('ações compartilhadas', () => {
  it('exibe tooltip visual no hover e no foco do botão de ícone', () => {
    render(
      <IconButton label="Editar registro">
        <Pencil size={17} />
      </IconButton>,
    );

    const action = screen.getByRole('button', { name: 'Editar registro' });

    fireEvent.mouseEnter(action);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Editar registro');

    fireEvent.mouseLeave(action);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(action);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Editar registro');
  });

  it('gera tooltip nativo a partir do texto das ações comuns', () => {
    render(
      <Button>
        <Pencil size={17} />
        Editar cadastro
      </Button>,
    );

    expect(
      screen.getByRole('button', { name: 'Editar cadastro' }),
    ).toHaveAttribute('title', 'Editar cadastro');
  });
});
