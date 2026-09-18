import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

afterEach(() => vi.restoreAllMocks());

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
