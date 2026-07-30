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

describe('App user features', () => {
  beforeEach(setupAppTest);

  it('cadastra usuario com senha inicial padrao e recarrega a lista', async () => {
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 2,
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581888888888',
      cpf: '11144477735',
      fotoPerfil: null,
      dataNascimento: '1992-05-10T00:00:00Z',
      precisaTrocarSenha: true,
      perfilId: 2,
      perfilNome: 'Médicos',
    });

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /novo usuário/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Bruno Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'bruno@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81988888888');
    await user.type(screen.getByLabelText('Data de nascimento'), '10051992');
    expect(screen.getByLabelText('Perfil')).toHaveValue('2');
    await user.type(screen.getByLabelText('CRM'), '12345');
    await user.selectOptions(screen.getByLabelText('UF do CRM'), 'PE');
    await user.click(
      within(document.querySelector('.module-form-grid')!).getByRole('button', {
        name: /cadastrar usuário/i,
      }),
    );

    expect(api.createUser).toHaveBeenCalledWith(
      {
        nome: 'Bruno Hemodinks',
        email: 'bruno@hemodinks.com',
        telefone: '+5581988888888',
        cpf: null,
        crm: '12345',
        crmUf: 'PE',
        fotoPerfil: null,
        dataNascimento: '1992-05-10',
        ativo: true,
        perfilId: 2,
      },
      'jwt-token',
    );
    expect(
      await screen.findByText('Usuário cadastrado com senha inicial Senha@123.'),
    ).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('permite anexar foto de perfil no cadastro', async () => {
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 3,
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      telefone: '+5581997777777',
      cpf: '93541134780',
      fotoPerfil: 'data:image/png;base64,YXZhdGFy',
      dataNascimento: '1991-03-12T00:00:00Z',
      precisaTrocarSenha: true,
    });

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /novo usuário/i }));

    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome completo'), 'Clara Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'clara@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81997777777');
    await user.type(screen.getByLabelText('CRM'), '98765');
    await user.selectOptions(screen.getByLabelText('UF do CRM'), 'SP');
    await user.upload(
      screen.getByLabelText('Foto do perfil'),
      new File(['avatar'], 'avatar.png', { type: 'image/png' }),
    );

    expect(await screen.findByAltText('Foto de Clara Hemodinks')).toBeInTheDocument();

    await user.click(
      within(document.querySelector('.module-form-grid')!).getByRole('button', {
        name: /cadastrar usuário/i,
      }),
    );

    expect(api.createUser).toHaveBeenCalledWith(
      {
        nome: 'Clara Hemodinks',
        email: 'clara@hemodinks.com',
        telefone: '+5581997777777',
        cpf: null,
        crm: '98765',
        crmUf: 'SP',
        fotoPerfil: 'data:image/png;base64,YXZhdGFy',
        dataNascimento: null,
        ativo: true,
        perfilId: 2,
      },
      'jwt-token',
    );
  }, 10_000);

  it('filtra usuarios pelo campo de busca', async () => {
    vi.mocked(api.getUsers)
      .mockResolvedValueOnce(
        paged([
          baseUser,
          {
            ...baseUser,
            id: 2,
            nome: 'Carlos Hemodinks',
            email: 'carlos@hemodinks.com',
            telefone: '+5581777777777',
          },
        ]),
      )
      .mockResolvedValueOnce(
        paged([
          {
            ...baseUser,
            id: 2,
            nome: 'Carlos Hemodinks',
            email: 'carlos@hemodinks.com',
            telefone: '+5581777777777',
          },
        ]),
      );

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Carlos Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar'), 'carlos');

    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: 'carlos',
        sortBy: 'recent',
        sortDirection: 'desc',
      });
    });

    expect(await screen.findByText('Carlos Hemodinks')).toBeInTheDocument();
    expect(screen.queryByText('Ana Hemodinks')).not.toBeInTheDocument();
  });

  it('ordena usuarios por registro recente e nome', async () => {
    vi.mocked(api.getUsers).mockResolvedValue(
      paged([
        {
          ...baseUser,
          id: 3,
          nome: 'Carlos Antigo',
          email: 'carlos@hemodinks.com',
          dataCadastro: '2026-05-20T09:00:00Z',
          dataAtualizacao: '2026-05-21T09:00:00Z',
        },
        {
          ...baseUser,
          id: 2,
          nome: 'Bruno Recente',
          email: 'bruno@hemodinks.com',
          dataCadastro: '2026-06-01T09:00:00Z',
          dataAtualizacao: '2026-06-03T09:00:00Z',
        },
        {
          ...baseUser,
          id: 1,
          nome: 'Ana Recente',
          email: 'ana.recente@hemodinks.com',
          dataCadastro: '2026-06-01T08:00:00Z',
          dataAtualizacao: '2026-06-03T09:00:00Z',
        },
      ]),
    );

    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Recente')).toBeInTheDocument();
    expect(getVisibleFirstColumnValues()).toEqual([
      'Ana Recente',
      'Bruno Recente',
      'Carlos Antigo',
    ]);
  });

  it('permite ordenar usuarios pelos cabeçalhos da tabela', async () => {
    const { user } = await renderAuthenticatedApp();

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^nome$/i }));

    await waitFor(() => {
      expect(api.getUsers).toHaveBeenLastCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        sortBy: 'nome',
        sortDirection: 'asc',
      });
    });
  });
});
