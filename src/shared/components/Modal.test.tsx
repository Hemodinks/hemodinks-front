import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Modal } from './Modal';
import userEvent from '@testing-library/user-event';

afterEach(() => vi.restoreAllMocks());

it('expõe nome e descrição e mantém Tab/Shift+Tab entre controles habilitados', async () => {
  // jsdom não calcula layout; offsetParent é usado pelo modal para filtrar controles visíveis.
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) {
    return this.hidden ? null : this.parentElement;
  });
  const user = userEvent.setup();
  render(<><button>Fora do modal</button><Modal titleId="keyboard-title" descriptionId="keyboard-description" onClose={vi.fn()}>
    <h2 id="keyboard-title">Confirmar alteração</h2>
    <p id="keyboard-description">Confira os dados antes de salvar.</p>
    <button>Primeiro</button><button disabled>Indisponível</button><button>Último</button>
  </Modal></>);
  const dialog = screen.getByRole('dialog', { name: 'Confirmar alteração' });
  expect(dialog).toHaveAccessibleDescription('Confira os dados antes de salvar.');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  const first = screen.getByRole('button', { name: 'Primeiro' });
  const last = screen.getByRole('button', { name: 'Último' });
  expect(first).toHaveFocus();
  await user.tab({ shift: true });
  expect(last).toHaveFocus();
  await user.tab();
  expect(first).toHaveFocus();
  await user.tab();
  expect(last).toHaveFocus();
});

it('mantém foco no diálogo sem controles e fecha por Escape uma única vez', async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<Modal titleId="empty-title" onClose={onClose}><h2 id="empty-title">Aguarde</h2></Modal>);
  const dialog = screen.getByRole('dialog', { name: 'Aguarde' });
  expect(dialog).toHaveFocus();
  await user.tab();
  expect(dialog).toHaveFocus();
  await user.tab({ shift: true });
  expect(dialog).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('mantém o foco no modal em StrictMode e o devolve ao acionador após fechar', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrameId, callback);
    return nextFrameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
  const flushFrames = () => act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  });
  render(<button>Adicionar procedimento</button>);
  const opener = screen.getByRole('button');
  opener.focus();
  const modal = render(<StrictMode><Modal titleId="test-modal-title" onClose={vi.fn()}>
    <h2 id="test-modal-title">Selecionar procedimento</h2>
    <button>Fechar seleção</button>
  </Modal></StrictMode>);
  flushFrames();
  expect(screen.getByRole('button', { name: 'Fechar seleção' })).toHaveFocus();
  modal.unmount();
  flushFrames();
  expect(opener).toHaveFocus();
});
