import { describe, expect, it } from 'vitest';
import type { AgendaEvent } from './agendaTypes';
import {
  buildAgendaEditForm,
  buildAgendaPayload,
  getAgendaFormError,
  toggleAgendaSelection,
} from './agendaControllerUtils';
import { buildEmptyForm } from './agendaUtils';

const agendaEvent: AgendaEvent = {
  id: 10,
  userId: 1,
  userName: 'Ana',
  medicalUserId: 7,
  title: 'Consulta',
  description: null,
  start: '2026-07-30T09:00:00',
  end: '2026-07-30T10:00:00',
  notifyMedicalProfile: true,
  notifyUser: false,
  reminderPeriodMinutes: 30,
  isCompleted: false,
  createdAt: '2026-07-01T00:00:00Z',
};

describe('agendaControllerUtils', () => {
  it('valida título, período e destinatários', () => {
    const form = buildEmptyForm('2026-07-30', false, undefined, new Date(2026, 6, 29));

    expect(getAgendaFormError(form)).toBe('Informe o titulo do evento.');
    expect(getAgendaFormError({ ...form, title: 'Consulta', endTime: '08:00' })).toBe(
      'A data final deve ser maior que a inicial.',
    );
    expect(
      getAgendaFormError({
        ...form,
        title: 'Consulta',
        notificationUserIds: [2],
      }),
    ).toBe('Informe a mensagem da notificação.');
    expect(
      getAgendaFormError({
        ...form,
        title: 'Consulta',
        notificationMessage: 'Lembrete',
      }),
    ).toBe('Selecione ao menos um destinatário para enviar a notificação.');
  });

  it('gera payload normalizado e formulário de edição', () => {
    const editForm = buildAgendaEditForm(agendaEvent);

    expect(editForm).toMatchObject({
      medicalUserId: '7',
      startDate: '2026-07-30',
      startTime: '09:00',
      reminderPeriodMinutes: '30',
    });
    expect(
      buildAgendaPayload({
        ...editForm,
        title: '  Consulta ',
        description: ' ',
        notificationMessage: '  Confirmar presença ',
        notificationUserIds: [2],
      }),
    ).toMatchObject({
      title: 'Consulta',
      description: null,
      medicalUserId: 7,
      reminderPeriodMinutes: 30,
      notificationMessage: 'Confirmar presença',
      notificationUserIds: [2],
    });
  });

  it('inclui e remove seleções sem mutar a lista original', () => {
    const original = [1, 2];

    expect(toggleAgendaSelection(original, 3)).toEqual([1, 2, 3]);
    expect(toggleAgendaSelection(original, 1)).toEqual([2]);
    expect(original).toEqual([1, 2]);
  });
});
