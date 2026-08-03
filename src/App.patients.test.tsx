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

describe('App patient features', () => {
  beforeEach(setupAppTest);

  it('permite cadastrar procedimento manual no modal CBHPM', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CbhpmLookupModal
        items={[]}
        filters={{
          codigo: '9.99.99.99-9',
          procedimento: 'Procedimento manual Hemodinks',
          porte: '1A',
        }}
        isAdmin={false}
        canConsult
        loading={false}
        error=""
        canSearch
        filterHint=""
        currentPage={1}
        totalPages={1}
        totalItems={0}
        visibleStart={0}
        visibleEnd={0}
        sortBy="codigo"
        sortDirection="asc"
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Nenhum procedimento encontrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cadastrar manualmente/i }));

    expect(onSelect).toHaveBeenCalledWith({
      id: 0,
      codigo: '99999999',
      procedimento: 'Procedimento manual Hemodinks',
      porte: '1A',
      valorReferencia: null,
    });
  });

  it('permite cadastrar procedimento manual sem codigo no modal CBHPM', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CbhpmLookupModal
        items={[]}
        filters={{
          codigo: '',
          procedimento: 'Procedimento sem codigo',
          porte: '',
        }}
        isAdmin={false}
        canConsult
        loading={false}
        error=""
        canSearch
        filterHint=""
        currentPage={1}
        totalPages={1}
        totalItems={0}
        visibleStart={0}
        visibleEnd={0}
        sortBy="codigo"
        sortDirection="asc"
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
        onRefresh={vi.fn()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );

    const manualButton = screen.getByRole('button', {
      name: /cadastrar manualmente/i,
    });

    expect(manualButton).toBeEnabled();
    await user.click(manualButton);
    expect(onSelect).toHaveBeenCalledWith({
      id: 0,
      codigo: '',
      procedimento: 'Procedimento sem codigo',
      porte: null,
      valorReferencia: null,
    });
  });

  it('mantem foco ao digitar nos filtros do modal CBHPM', async () => {
    const user = userEvent.setup();

    function ControlledCbhpmLookupModal() {
      const [filters, setFilters] = useState({
        codigo: '',
        procedimento: '',
        porte: '',
      });

      return (
        <CbhpmLookupModal
          items={[]}
          filters={filters}
          isAdmin
          canConsult
          loading={false}
          error=""
          canSearch
          filterHint=""
          currentPage={1}
          totalPages={1}
          totalItems={0}
          visibleStart={0}
          visibleEnd={0}
          sortBy="codigo"
          sortDirection="asc"
          onFiltersChange={setFilters}
          onPageChange={vi.fn()}
          onSortChange={vi.fn()}
          onRefresh={vi.fn()}
          onSelect={vi.fn()}
          onClose={() => vi.fn()}
        />
      );
    }

    render(<ControlledCbhpmLookupModal />);

    const procedimentoFilter = screen.getByLabelText('Procedimento');

    await user.click(procedimentoFilter);
    await user.keyboard('Consulta');

    expect(procedimentoFilter).toHaveValue('Consulta');
    expect(procedimentoFilter).toHaveFocus();
  });

  it('lista e cadastra pacientes apenas com dados cadastrais', async () => {
    vi.mocked(api.createPaciente).mockResolvedValue({
      ...basePaciente,
      id: 11,
      nomePaciente: 'Novo Paciente',
      hospitalId: 2,
      hospital: 'Santa Genoveva - Mater Dei',
      email: 'paciente-tecnico@hemodinks.local',
      telefone: '',
      cpf: null,
      statusPago: false,
      convitePrimeiroAcessoEnviado: true,
    });

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);

    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
      page: 1,
      pageSize: 10,
      search: '',
      sortBy: 'recent',
      sortDirection: 'desc',
    });

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));

    await user.type(screen.getByLabelText('Nome completo'), 'Novo Paciente');
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-mail de acesso')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefone')).toBeInTheDocument();
    expect(screen.getByLabelText('Data de nascimento')).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Valor recebido/pago')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Glosa')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /adicionar procedimento/i }),
    ).not.toBeInTheDocument();
    await user.click(
      within(document.querySelector('.module-form-grid')!).getByRole('button', {
        name: /cadastrar paciente/i,
      }),
    );

    expect(api.createPaciente).toHaveBeenCalledWith(
      expect.objectContaining({
        nomePaciente: 'Novo Paciente',
        cpf: null,
        pagamento: '',
      }),
      'jwt-token',
    );
    expect(
      await screen.findByText(
        'Paciente cadastrado. Enviamos por email o link para criar a senha de primeiro acesso.',
      ),
    ).toBeInTheDocument();
  }, 15000);

  it('permite ao administrador filtrar pacientes por cirurgiao, convenio e procedimento', async () => {
    vi.mocked(api.getPacientes)
      .mockResolvedValueOnce(paged([basePaciente]))
      .mockResolvedValue(paged([{ ...basePaciente, nomePaciente: 'Paciente Filtrado' }]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cirurgião'), 'Ana Hemodinks');
    await user.type(screen.getByLabelText('Convênio'), 'Particular');
    await user.type(screen.getByLabelText('Procedimento'), 'Consulta');

    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        medico: 'Ana Hemodinks',
        convenio: 'Particular',
        procedimento: 'Consulta',
        sortBy: 'recent',
        sortDirection: 'desc',
      });
    });
  });
});
