vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './services';
import { CbhpmLookupModal } from './features/patients/CbhpmLookupModal';
import type { Paciente, PacienteObservacao, User } from './types';
import { basePaciente, baseUser, paged } from './test/appTestData';
import { getVisibleFirstColumnValues, openPatientsModule, renderAuthenticatedApp } from './test/appTestUi';
import { resetAppTestState } from './test/appTestSetup';

describe('App — pacientes e CBHPM', () => {
  beforeEach(resetAppTestState);

  it('destaca observacoes nao lidas na lista de pacientes e no modal', async () => {
    const pacienteComNaoLidas: Paciente = {
      ...basePaciente,
      observacoesNaoLidasCount: 3,
    };
    const observacoes: PacienteObservacao[] = [
      {
        id: 1,
        pacienteId: basePaciente.id,
        texto: 'Primeira observacao sem leitura.',
        dataCadastro: '2026-06-01T10:00:00Z',
        autorUserId: 1,
        autorNome: 'Dra. Ana',
        autorPerfilId: 2,
        autorPerfilNome: 'Médicos',
        destinatarioUserId: 99,
        destinatarioNome: 'George Marcone',
        destinatarioPerfilId: 1,
        destinatarioPerfilNome: 'Administrador',
        nomePaciente: basePaciente.nomePaciente,
        foiLida: false,
        enviadaPorMim: false,
      },
      {
        id: 2,
        pacienteId: basePaciente.id,
        texto: 'Resposta ja lida.',
        dataCadastro: '2026-06-01T11:00:00Z',
        autorUserId: 99,
        autorNome: 'George Marcone',
        autorPerfilId: 1,
        autorPerfilNome: 'Administrador',
        destinatarioUserId: 1,
        destinatarioNome: 'Dra. Ana',
        destinatarioPerfilId: 2,
        destinatarioPerfilNome: 'Médicos',
        nomePaciente: basePaciente.nomePaciente,
        foiLida: true,
        enviadaPorMim: true,
      },
    ];

    vi.mocked(api.getPacientes).mockResolvedValue(paged([pacienteComNaoLidas]));
    vi.mocked(api.getPaciente).mockResolvedValue(pacienteComNaoLidas);
    vi.mocked(api.getPacienteObservacoes).mockResolvedValue(observacoes);
    vi.mocked(api.markPacienteObservacoesAsRead).mockResolvedValue({ pacienteId: basePaciente.id, updatedCount: 0 });

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^pacientes/i }));

    const patientRow = await screen.findByText('Paciente Hemodinks', {}, { timeout: 5_000 });
    const observationButton = within(patientRow.closest('tr')!).getByRole('button', { name: /observações de paciente hemodinks/i });
    expect(within(observationButton).getByText('3')).toBeInTheDocument();
    expect(observationButton).toHaveClass('has-unread-observations');

    await user.click(observationButton);

    const dialog = await screen.findByRole('dialog', { name: 'Paciente Hemodinks' });
    expect(within(dialog).getByText('3 observações não lidas')).toBeInTheDocument();
    expect(within(dialog).getByText('Não lida')).toBeInTheDocument();
    expect(within(dialog).getByText('Lida')).toBeInTheDocument();
  });

  it('exibe hospital e destaque visual no popup de informacoes do paciente', async () => {
    vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    const row = await screen.findByText('Paciente Hemodinks');

    await user.click(within(row.closest('tr')!).getByRole('button', { name: /informações adicionais de paciente hemodinks/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Paciente Hemodinks' });
    expect(within(dialog).getByText('Hospital')).toBeInTheDocument();
    expect(within(dialog).getByText('Santa Clara - Mater Dei')).toBeInTheDocument();
    expect(within(dialog).getByText('Convênio')).toBeInTheDocument();
    expect(within(dialog).getByText('Particular')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimentos')).toBeInTheDocument();
  });

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

    const manualButton = screen.getByRole('button', { name: /cadastrar manualmente/i });

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

  it('lista e cadastra pacientes', async () => {
    const auxiliar1: User = {
      ...baseUser,
      id: 2,
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      cpf: '11144477735',
    };
    const auxiliar2: User = {
      ...baseUser,
      id: 3,
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      cpf: '93541134780',
    };
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser, auxiliar1, auxiliar2]));
    const cbhpmProcedures = [
      {
        id: 1,
        codigo: '1.01.01.01-2',
        procedimento: 'Consulta',
        porte: '2B',
        valorReferencia: 120,
      },
      {
        id: 2,
        codigo: '1.01.02.01-9',
        procedimento: 'Visita hospitalar',
        porte: '2A',
        valorReferencia: 180,
      },
    ];
    vi.mocked(api.getCbhpmGeral).mockImplementation(async (_token, query) => {
      const codigo = query?.codigo ?? '';
      const procedimento = query?.procedimento?.toLocaleLowerCase('pt-BR') ?? '';
      const items = codigo.includes('1010201')
        ? [cbhpmProcedures[1]]
        : codigo.includes('1010101') || procedimento.includes('consulta')
          ? [cbhpmProcedures[0]]
          : cbhpmProcedures;

      return paged(items, query?.page ?? 1, query?.pageSize ?? 10);
    });
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
    });

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);

    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));

    await user.type(screen.getByLabelText('Data da Solicitação'), '04062026');
    expect(screen.getByLabelText('Selecionar cirurgias consolidadas')).not.toHaveAttribute('max');
    await user.type(screen.getByLabelText('Cirurgias Consolidadas'), '01122026');
    await user.type(screen.getByLabelText('Paciente'), 'Novo Paciente');
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Telefone')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Data de nascimento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Convênio'), 'Convenio Manual');
    await user.type(screen.getByLabelText('Hospital'), 'Hospital Manual');
    await user.type(screen.getByLabelText('Fornecedor OPME'), 'Fornecedor Manual');
    await user.type(screen.getByLabelText('Cirurgião'), 'Ana Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Ana Hemodinks' }));
    await user.type(screen.getByLabelText('Médico auxiliar 1'), 'Bruno Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Bruno Hemodinks' }));
    await user.type(screen.getByLabelText('Médico auxiliar 2'), 'Clara Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Clara Hemodinks' }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));
    const cbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const refreshProceduresButton = within(cbhpmDialog).getByRole('button', { name: /consultar procedimentos/i });
    await waitFor(() => {
      expect(refreshProceduresButton).toBeEnabled();
    });
    fireEvent.change(within(cbhpmDialog).getByLabelText('Procedimento'), { target: { value: 'Consulta' } });
    await user.click(refreshProceduresButton);
    await waitFor(() => {
      expect(api.getCbhpmGeral).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ procedimento: 'Consulta' }));
    });
    await waitFor(() => {
      expect(within(cbhpmDialog).queryByText('Carregando procedimentos...')).not.toBeInTheDocument();
    });
    expect(within(cbhpmDialog).getByText('10101012')).toBeInTheDocument();
    const firstProcedureRow = within(cbhpmDialog).getByText('10101012').closest('tr');
    expect(firstProcedureRow).not.toBeNull();
    await user.click(within(firstProcedureRow!).getByRole('button', { name: /^adicionar$/i }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));
    const secondCbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const secondCodigoField = within(secondCbhpmDialog).getByLabelText('Código');
    const refreshSecondProceduresButton = within(secondCbhpmDialog).getByRole('button', { name: /consultar procedimentos/i });
    await waitFor(() => {
      expect(refreshSecondProceduresButton).toBeEnabled();
    });
    fireEvent.change(secondCodigoField, { target: { value: '1010201' } });
    await user.click(refreshSecondProceduresButton);
    await waitFor(() => {
      expect(api.getCbhpmGeral).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ codigo: '1010201' }));
    });
    await waitFor(() => {
      expect(within(secondCbhpmDialog).queryByText('Carregando procedimentos...')).not.toBeInTheDocument();
    });
    expect(within(secondCbhpmDialog).getByText('10102019')).toBeInTheDocument();
    const secondProcedureRow = within(secondCbhpmDialog).getByText('10102019').closest('tr');
    expect(secondProcedureRow).not.toBeNull();
    await user.click(within(secondProcedureRow!).getByRole('button', { name: /^adicionar$/i }));
    expect(screen.getByLabelText('Valor estimado')).toHaveValue('R$\u00a0300,00');
    expect(screen.getByLabelText('Valor estimado')).toBeDisabled();
    expect(screen.getByLabelText('Valor recebido/pago')).toHaveValue('');
    expect(screen.getByLabelText('Glosa')).toHaveValue('R$ 300,00');
    expect(screen.getByLabelText('Glosa')).toBeDisabled();
    await user.click(screen.getByLabelText('Valor recebido/pago'));
    await user.keyboard('125,45');
    expect(screen.getByLabelText('Valor recebido/pago')).toHaveValue('R$ 125,45');
    expect(screen.getByLabelText('Glosa')).toHaveValue('R$ 174,55');
    const paymentDateField = screen.getByLabelText('Data do Pagamento');
    expect(paymentDateField).toBeDisabled();
    await user.click(screen.getByLabelText('Status Pago'));
    expect(paymentDateField).toBeEnabled();
    await user.type(paymentDateField, '05062026');
    expect(paymentDateField).toHaveValue('05/06/2026');
    await user.click(screen.getByLabelText('Status Pago'));
    expect(paymentDateField).toBeDisabled();
    expect(paymentDateField).toHaveValue('');
    await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));

    expect(api.createPaciente).toHaveBeenCalledWith({
      tipoCirurgia: 'EmAutorizacao',
      data: '2026-06-04',
      dataAtendimento: '2026-12-01',
      nomePaciente: 'Novo Paciente',
      diagnostico: '',
      tratamentoMedico: '',
      cpf: '',
      email: '',
      telefone: '',
      fotoPerfil: null,
      dataNascimento: '1900-01-01',
      hospitalId: null,
      hospital: 'Hospital Manual',
      medicoUserId: 1,
      medico: 'Ana Hemodinks',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Bruno Hemodinks',
      medicoAuxiliar2UserId: 3,
      medicoAuxiliar2: 'Clara Hemodinks',
      convenioId: null,
      convenio: 'Convenio Manual',
      opmeFornecedorId: null,
      opmeFornecedor: 'Fornecedor Manual',
      cbhpmCodigo: '10101012',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      procedimentos: [
        {
          cbhpmCodigo: '10101012',
          cbhpmPorte: '2B',
          procedimento: 'Consulta',
          valorReferencia: 120,
        },
        {
          cbhpmCodigo: '10102019',
          cbhpmPorte: '2A',
          procedimento: 'Visita hospitalar',
          valorReferencia: 180,
        },
      ],
      autorizacao: '',
      pagamento: 'R$ 125,45',
      repasseGlosa: 'R$ 174,55',
      statusPago: false,
      dataPagamento: null,
      ativo: true,
    }, 'jwt-token');
    expect(await screen.findByText('Paciente cadastrado com sucesso.')).toBeInTheDocument();
  }, 30_000);

  it('permite ao administrador filtrar pacientes por cirurgiao, convenio e procedimento', async () => {
    vi.mocked(api.getPacientes)
      .mockResolvedValueOnce(paged([basePaciente]))
      .mockResolvedValue(paged([{ ...basePaciente, nomePaciente: 'Paciente Filtrado' }]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Filtros de pacientes', { selector: 'summary' }));

    await user.type(screen.getByLabelText('Cirurgião'), 'Ana Hemodinks');
    await user.click(screen.getByRole('option', { name: 'Ana Hemodinks' }));
    await user.type(screen.getByLabelText('Convênio'), 'Particular');
    await user.click(screen.getByRole('option', { name: 'Particular' }));
    await user.type(screen.getByLabelText('Procedimento'), 'Consulta');
    await user.type(screen.getByLabelText('Cirurgias Consolidadas - inicial'), '01062026');
    await user.type(screen.getByLabelText('Cirurgias Consolidadas - final'), '30062026');
    await user.type(screen.getByLabelText('Data inicial da solicitação'), '01052026');
    await user.type(screen.getByLabelText('Data final da solicitação'), '31052026');

    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        medicoUserIds: '1',
        convenioIds: '7',
        procedimento: 'Consulta',
        dataInicio: '2026-06-01',
        dataFinal: '2026-06-30',
        dataSolicitacaoInicio: '2026-05-01',
        dataSolicitacaoFinal: '2026-05-31',
        sortBy: 'data',
        sortDirection: 'desc',
      });
    });
  });

  it.each([
    ['data', 'Data da solicitação'],
    ['dataAtendimento', 'Cirurgias Consolidadas'],
  ])('ordena pacientes por %s em ordem descendente e ascendente ao clicar', async (field, label) => {
    const newer = { ...basePaciente, id: 11, nomePaciente: 'Cirurgia Futura', data: '2030-12-01', dataAtendimento: '2030-12-01', dataAtualizacao: '2025-01-01' };
    const older = { ...basePaciente, id: 12, nomePaciente: 'Cirurgia Anterior', data: '2026-12-31', dataAtendimento: '2026-12-31', dataAtualizacao: '2026-09-01' };
    vi.mocked(api.getPacientes).mockImplementation(async (_token, query) =>
      paged(query?.sortDirection === 'asc' ? [older, newer] : [newer, older]));
    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Cirurgia Futura')).toBeInTheDocument();
    for (const direction of ['desc', 'asc', 'desc'] as const) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }));
      await waitFor(() => {
        expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
          page: 1, pageSize: 10, search: '', sortBy: field, sortDirection: direction,
        });
        expect(getVisibleFirstColumnValues()).toEqual(direction === 'desc'
          ? ['Cirurgia Futura', 'Cirurgia Anterior'] : ['Cirurgia Anterior', 'Cirurgia Futura']);
      });
      expect(screen.getByRole('columnheader', { name: new RegExp(label, 'i') }))
        .toHaveAttribute('aria-sort', direction === 'desc' ? 'descending' : 'ascending');
    }
  });

  it('preserva a ordem dos pacientes recebida da API mesmo com datas de atualizacao diferentes', async () => {
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser]));
    vi.mocked(api.getPacientes).mockResolvedValue(paged([
      {
        ...basePaciente,
        id: 13,
        nomePaciente: 'Zelia Antiga',
        email: 'zelia@hemodinks.com',
        cpf: '93541134780',
        fotoPerfil: 'data:image/png;base64,zelia',
        dataAtualizacao: '2026-05-20T09:00:00Z',
      },
      {
        ...basePaciente,
        id: 12,
        nomePaciente: 'Bruno Recente',
        email: 'bruno.paciente@hemodinks.com',
        cpf: '52998224725',
        fotoPerfil: 'data:image/png;base64,bruno',
        dataAtualizacao: '2026-06-03T09:00:00Z',
      },
      {
        ...basePaciente,
        id: 11,
        nomePaciente: 'Ana Recente',
        email: 'ana.paciente@hemodinks.com',
        cpf: '11144477735',
        fotoPerfil: 'data:image/png;base64,ana',
        dataAtualizacao: '2026-06-03T09:00:00Z',
      },
    ]));

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    expect(await screen.findByText('Ana Recente')).toBeInTheDocument();
    expect(getVisibleFirstColumnValues()).toEqual(['Zelia Antiga', 'Bruno Recente', 'Ana Recente']);
  });
});
