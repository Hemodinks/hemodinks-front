import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AppUpdateNotice } from './AppUpdateNotice';
import { useAppUpdate } from '../hooks/useAppUpdate';
vi.mock('../hooks/useAppUpdate', () => ({ useAppUpdate: vi.fn() }));

it('only displays an available update and allows continuing without a reload', () => {
  vi.mocked(useAppUpdate).mockReturnValue(false);
  const { rerender } = render(<AppUpdateNotice />);
  expect(screen.queryByRole('button', { name: 'Atualizar sistema' })).not.toBeInTheDocument();
  vi.mocked(useAppUpdate).mockReturnValue(true);
  rerender(<AppUpdateNotice />);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar sistema' }));
  expect(screen.getByRole('dialog', { name: 'Atualizar sistema?' })).toBeInTheDocument();
  expect(screen.getByText(/Dados ainda não salvos serão perdidos/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar trabalhando' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Atualizar sistema' })).toBeInTheDocument();
});
