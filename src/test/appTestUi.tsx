import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import App from '../App';
import * as api from '../services';
import type { AuthSession } from '../types';
import { mockSession, toLoginResponse } from './appTestData';

export function getVisibleFirstColumnValues() {
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  return rows.map((row) => within(row).getAllByRole('cell')[0].textContent?.trim() ?? '');
}

export async function renderAuthenticatedApp(options?: {
  initialPath?: string;
  sessionOverrides?: Partial<AuthSession['user']>;
  password?: string;
}) {
  const user = userEvent.setup();
  const session = mockSession(options?.sessionOverrides);

  vi.mocked(api.authenticate).mockResolvedValue(toLoginResponse(session));

  if (options?.initialPath) {
    window.history.pushState({}, '', options.initialPath);
  }

  render(<App />);

  await screen.findByDisplayValue('Hemodinks');
  await user.type(screen.getByLabelText('Email'), session.user.email);
  await user.type(screen.getByLabelText('Senha'), options?.password ?? 'SenhaAlterada@123');
  await user.click(screen.getByRole('button', { name: /entrar/i }));

  return { user, session };
}

export async function openUsersModule(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /abrir usuários/i }));
  expect(window.location.pathname).toBe('/usuarios');
}

export async function openPatientsModule(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /abrir pacientes/i }));
  expect(window.location.pathname).toBe('/pacientes');
}
