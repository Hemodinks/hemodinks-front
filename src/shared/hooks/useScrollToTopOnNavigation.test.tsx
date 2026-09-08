import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollToTopOnNavigation } from './useScrollToTopOnNavigation';

function NavigationHarness() {
  const navigate = useNavigate();
  useScrollToTopOnNavigation();

  return <button type="button" onClick={() => navigate('/clinicas')}>Abrir clínicas</button>;
}

describe('useScrollToTopOnNavigation', () => {
  beforeEach(() => vi.mocked(window.scrollTo).mockClear());

  it('posiciona a janela no topo ao entrar e ao trocar de tela', async () => {
    render(
      <MemoryRouter initialEntries={['/pacientes']}>
        <NavigationHarness />
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'auto' });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir clínicas' }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(2));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
