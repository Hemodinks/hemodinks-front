import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { basePaciente, mockSession } from '../../test/appTestData';
import { BillingPage } from './BillingPage';
import { BillingHistoryPage } from './BillingHistoryPage';
import { loadBillingPatients } from './billingPageUtils';
import { getBillingHistoryFiles, downloadBillingHistoryFile } from '../../services';
import { advanceSessionEpoch } from '../../services/sessionEpoch';
import { downloadBlob } from '../../shared/utils/downloadFile';

vi.mock('../../shared/utils/downloadFile', () => ({ downloadBlob: vi.fn() }));

vi.mock('./billingPageUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('./billingPageUtils')>(), loadBillingPatients: vi.fn(),
}));
vi.mock('../../services', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services')>(), getBillingHistoryFiles: vi.fn(async () => []), downloadBillingHistoryFile: vi.fn(),
}));

function setup(history: boolean, withoutAttendanceDate = false) {
  vi.mocked(loadBillingPatients).mockResolvedValue(['2030-12-01', '2030-12-20'].map((date, index) => ({
    ...basePaciente, id: index + 1, nomePaciente: index === 0 ? 'Paciente Antigo' : 'Paciente Novo',
    fotoPerfil: null, data: date, dataAtendimento: withoutAttendanceDate ? null : date,
    faturamento: {
      id: index + 1, pacienteId: index + 1, dataCadastro: '2026-01-01', dataPagamento: date,
      anestesistaFaturadoSeparado: false, conferenciaPagamentoRealizada: false,
    },
  })));
  const props = { session: mockSession(), medicalUsers: [], convenios: [], isAdmin: true, isMedical: false };
  render(<QueryClientProvider client={queryClient}><MemoryRouter>
    {history ? <BillingHistoryPage {...props} canManageFiles={false} /> : <BillingPage {...props} />}
  </MemoryRouter></QueryClientProvider>);
  return userEvent.setup();
}

async function verifyClicks(user: ReturnType<typeof userEvent.setup>, label: string) {
  for (const expected of [['Paciente Novo', 'Paciente Antigo'], ['Paciente Antigo', 'Paciente Novo']]) {
    await user.click(screen.getByRole('button', { name: label }));
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].querySelector('strong')?.textContent)).toEqual(expected);
  }
}

describe('colunas de data do faturamento', () => {
  it('não baixa arquivo do histórico se a clínica mudar durante o download', async () => {
    vi.mocked(getBillingHistoryFiles).mockResolvedValueOnce([{ id: 1, ano: 2030, mes: 12, nomeOriginal: 'privado.pdf', contentType: 'application/pdf', tamanhoBytes: 10, dataUpload: '2030-12-01' }]);
    let finish!: (blob: Blob) => void;
    const file = new Promise<Blob>((resolve) => { finish = resolve; });
    vi.mocked(downloadBillingHistoryFile).mockReturnValueOnce(file);
    const user = setup(true);
    await user.click(await screen.findByRole('button', { name: /Dezembro.*2 atendimento/i }));
    await user.click(await screen.findByRole('button', { name: 'Baixar privado.pdf' }));
    advanceSessionEpoch();
    await act(async () => { finish(new Blob(['clinic A'])); await file; });
    expect(downloadBlob).not.toHaveBeenCalled();
  });
  it('alterna a data do pagamento entre descendente e ascendente', async () => {
    const user = setup(false);
    await screen.findByText('Paciente Antigo');
    await verifyClicks(user, 'Data do pagamento');
  });

  it('alterna a data da cirurgia dentro do mes do historico', async () => {
    const user = setup(true);
    await user.click(await screen.findByRole('button', { name: /Dezembro.*2 atendimento/i }));
    await verifyClicks(user, 'Cirurgias Consolidadas');
  });

  it('alterna a data da solicitacao nos atendimentos sem consolidacao', async () => {
    const user = setup(true, true);
    await user.click(await screen.findByRole('button', { name: 'Ver atendimentos' }));
    await verifyClicks(user, 'Data da solicitação');
  });
});
