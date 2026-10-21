import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { UserAvatar } from './UserAvatar';

it('expõe as iniciais sem foto como imagem com nome acessível', () => {
  render(<UserAvatar name="Ana Hemodinks" />);
  expect(screen.getByRole('img', { name: 'Sem foto de Ana Hemodinks' })).toHaveTextContent('AH');
});

it('mantém avatar decorativo fora da árvore acessível e sem nome redundante', () => {
  render(<UserAvatar name="Ana Hemodinks" decorative />);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('AH')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByText('AH')).not.toHaveAttribute('aria-label');
});
