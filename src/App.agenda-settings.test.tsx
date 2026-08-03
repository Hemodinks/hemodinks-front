import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildEmptyForm } from './features/events/AgendaPage';
import * as api from './services';
import { CbhpmLookupModal } from './features/patients/CbhpmLookupModal';
import { queryClient } from './queryClient';
import type { AuthSession } from './shared/domain/sessionTypes';
import type { Paciente } from './shared/domain/clinicalContracts';
import type { PacienteObservacao } from './features/patients/patientTypes';
import type { User } from './features/users/userTypes';
import {
  basePaciente,
  baseUser,
  buildMedicalLicense,
  mockSession,
  paged,
  SESSION_KEY,
} from './test/appTestData';
import {
  getVisibleFirstColumnValues,
  openPatientsModule,
  openUsersModule,
  renderAuthenticatedApp,
} from './test/appTestUi';
import { createJwtToken, setupAppTest } from './test/appTestSetup';

vi.mock('./services', async () => {
  const { createAppServicesMock } = await import('./test/appServicesMock');
  return createAppServicesMock();
});

describe('App agenda and settings', () => {
  beforeEach(setupAppTest);

  it('abre a agenda por URL direta', async () => {
    const { user } = await renderAuthenticatedApp({ initialPath: '/agenda' });

    expect(
      await screen.findByRole('heading', { name: 'Agenda e notificações', level: 2 }),
    ).toBeInTheDocument();
    const newEventButtons = await screen.findAllByRole('button', {
      name: /^novo evento$/i,
    });
    expect(newEventButtons[0]).toBeInTheDocument();
    await user.click(newEventButtons[0]);
    expect(
      await screen.findByRole('heading', { name: 'Novo evento', level: 2 }),
    ).toBeInTheDocument();
    expect(api.getAgendaEvents).toHaveBeenCalled();
  });

  it('mantem o formulario da agenda valido quando o horario padrao cruza a meia-noite', () => {
    const form = buildEmptyForm('2026-07-02', false, undefined, new Date(2026, 6, 2, 22, 20, 0));

    expect(form.startDate).toBe('2026-07-02');
    expect(form.startTime).toBe('23:00');
    expect(form.endDate).toBe('2026-07-03');
    expect(form.endTime).toBe('00:00');
  });

  it('exclui apenas o evento clicado na agenda', async () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
    vi.mocked(api.getAgendaEvents).mockResolvedValue([
      {
        id: 101,
        userId: 1,
        userName: 'George Marcone',
        medicalUserId: null,
        medicalUserName: null,
        title: 'Evento A',
        description: 'Primeiro evento',
        start: `${todayKey}T12:00:00Z`,
        end: `${todayKey}T13:00:00Z`,
        notifyMedicalProfile: false,
        notifyUser: false,
        reminderPeriodMinutes: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        isCompleted: false,
        completedAt: null,
        createdAt: `${todayKey}T11:00:00Z`,
        updatedAt: null,
      },
      {
        id: 202,
        userId: 1,
        userName: 'George Marcone',
        medicalUserId: null,
        medicalUserName: null,
        title: 'Evento B',
        description: 'Segundo evento',
        start: `${todayKey}T15:00:00Z`,
        end: `${todayKey}T16:00:00Z`,
        notifyMedicalProfile: false,
        notifyUser: false,
        reminderPeriodMinutes: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        isCompleted: false,
        completedAt: null,
        createdAt: `${todayKey}T14:00:00Z`,
        updatedAt: null,
      },
    ]);

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(
      within(screen.getByLabelText('Sessão ativa')).getByRole('button', {
        name: /agenda e notificações/i,
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Agenda e notificações',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Evento A')).toBeInTheDocument();
    const eventCard = screen.getByText('Evento A').closest('article');
    expect(eventCard).not.toBeNull();

    await user.click(within(eventCard as HTMLElement).getByLabelText('Excluir'));

    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Excluir evento?',
    });
    expect(within(confirmDialog).getByText(/Deseja excluir "Evento A"/i)).toBeInTheDocument();
    expect(api.deleteAgendaEvent).not.toHaveBeenCalled();

    await user.click(within(confirmDialog).getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(api.deleteAgendaEvent).toHaveBeenCalledWith(101, 'jwt-token'));
    expect(api.deleteAgendaEvent).not.toHaveBeenCalledWith(202, 'jwt-token');
  });

  it('alterna entre tema claro e escuro no painel logado', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-theme');

    await user.click(screen.getByRole('button', { name: /abrir configuração do sistema/i }));
    expect(
      await screen.findByRole('heading', {
        name: 'Configuração do sistema',
        level: 1,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /escuro/i }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('hemodinks.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: /claro/i }));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('hemodinks.theme')).toBe('light');
  });

  it('oculta a tabela de preços por padrão e persiste a opção de exibição', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    const sidebar = within(screen.getByLabelText('Sessão ativa'));
    await user.click(sidebar.getByRole('button', { name: 'Controladoria' }));
    expect(sidebar.queryByRole('button', { name: 'Tabela de preços' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir configuração do sistema/i }));
    const priceVisibility = screen.getByRole('group', {
      name: 'Exibição da tabela de preços',
    });
    expect(within(priceVisibility).getByRole('button', { name: 'Ocultar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(priceVisibility).getByRole('button', { name: 'Exibir' }));

    await waitFor(() => expect(localStorage.getItem('hemodinks.billing.show-prices')).toBe('true'));
    expect(sidebar.getByRole('button', { name: 'Tabela de preços' })).toBeInTheDocument();
  });

  it('remove a edicao da marca das configuracoes do sistema', async () => {
    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir configuração do sistema/i }));
    expect(
      await screen.findByRole('heading', {
        name: 'Configuração do sistema',
        level: 1,
      }),
    ).toBeInTheDocument();

    expect(screen.queryByLabelText('Nome exibido no sistema')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto da empresa')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tema do sistema' })).toBeInTheDocument();
    expect(api.updateSystemSettings).not.toHaveBeenCalled();
  });
});
