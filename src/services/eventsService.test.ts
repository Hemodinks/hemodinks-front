import { beforeEach, describe, expect, it, vi } from 'vitest';
import { del, get, post, put } from './api';
import {
  completeAgendaEvent,
  createAgendaEvent,
  deleteAgendaEvent,
  getAgendaEvents,
  getAgendaMedicalUsers,
  getAgendaNotificationRecipientOptions,
  markAgendaNotificationsAsRead,
  updateAgendaEvent,
} from './eventsService';
import type { AgendaEventPayload } from '../shared/domain/agendaContracts';

vi.mock('./api', () => ({
  del: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

const payload: AgendaEventPayload = {
  title: 'Reunião clínica',
  start: '2026-08-01T09:00:00',
  end: '2026-08-01T10:00:00',
  notifyMedicalProfile: false,
  notifyUser: true,
};

describe('eventsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('monta filtros opcionais ao consultar eventos', () => {
    getAgendaEvents('token', '2026-08-01', '2026-08-31');
    expect(get).toHaveBeenCalledWith('/api/events/', 'token', {
      params: new URLSearchParams({ from: '2026-08-01', to: '2026-08-31' }),
    });

    getAgendaEvents('token');
    expect(get).toHaveBeenLastCalledWith('/api/events/', 'token', { params: undefined });
  });

  it('encaminha todas as operações e endpoints da agenda', () => {
    createAgendaEvent(payload, 'token');
    updateAgendaEvent(7, payload, 'token');
    completeAgendaEvent(7, 'token');
    deleteAgendaEvent(7, 'token');
    getAgendaMedicalUsers('token');
    getAgendaNotificationRecipientOptions('token');
    markAgendaNotificationsAsRead('token');

    expect(post).toHaveBeenNthCalledWith(1, '/api/events/', payload, 'token');
    expect(put).toHaveBeenCalledWith('/api/events/7', payload, 'token');
    expect(post).toHaveBeenNthCalledWith(2, '/api/events/7/complete', undefined, 'token');
    expect(del).toHaveBeenCalledWith('/api/events/7', 'token');
    expect(get).toHaveBeenNthCalledWith(1, '/api/events/medical-users', 'token');
    expect(get).toHaveBeenNthCalledWith(2, '/api/events/notification-recipients', 'token');
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/api/events/notifications/mark-read',
      undefined,
      'token',
    );
  });
});
