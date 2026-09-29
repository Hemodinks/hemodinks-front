import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { AgendaEvent } from '../../types';
import { AgendaPeriodView } from './AgendaPeriodView';
const event = { id: 1, userId: 10, userName: 'Ana', title: 'Evento prolongado', start: new Date(2026, 8, 26, 23).toISOString(), end: new Date(2026, 8, 27, 1).toISOString() } as AgendaEvent;
const props = () => ({ visibleMonth: new Date(2026, 8, 1), selectedDate: '2026-09-26', todayKey: '2026-09-26', events: [event], loading: false, isAdmin: false, currentUserId: 10,
  onSelectDate: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(), onComplete: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() });
it('shows a cross-day event on both week days with unique IDs and existing actions', () => {
  const callbacks = props(); render(<AgendaPeriodView {...callbacks} view="week" />);
  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(2);
  expect(new Set(cards.map(card => card.id)).size).toBe(2);
  fireEvent.click(within(cards[0]).getByRole('button', { name: 'Editar' }));
  expect(callbacks.onEdit).toHaveBeenCalledWith(event);
  fireEvent.click(screen.getByRole('button', { name: /domingo, 27/ }));
  expect(callbacks.onSelectDate).toHaveBeenCalledWith(new Date(2026, 8, 27));
});
it('shows list events only once and preserves read-only permissions', () => {
  render(<AgendaPeriodView {...props()} view="list" currentUserId={20} />);
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Hoje' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
});
