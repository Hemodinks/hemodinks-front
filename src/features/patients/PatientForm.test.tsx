import { useState, type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import { PatientForm } from './PatientForm';
import { getPacienteFormData } from './patientUtils';
import type { PacienteFormData } from '../../types';

vi.mock('./usePatientFormExport', () => ({
  usePatientFormExport: () => ({ exportLoading: null, exportError: '', handleExport: vi.fn() }),
}));

function props(overrides: Partial<ComponentProps<typeof PatientForm>> = {}): ComponentProps<typeof PatientForm> {
  return {
    canEditPatients: true, editingPacienteId: basePaciente.id, editingPaciente: basePaciente,
    patientReadOnly: false, pacienteFormData: getPacienteFormData(basePaciente), pacienteFormError: '',
    pacienteFormLoading: false, pendingPatientFiles: [], patientFileInputKey: 0, sessionToken: 'test-token',
    hospitais: [{ id: 1, nome: basePaciente.hospital! }], hospitaisError: '', medicalUsers: [{ id: 1, nome: 'Dra. Ana', email: 'ana@example.invalid' }],
    convenios: [], conveniosError: '', opmeFornecedores: [], opmeFornecedoresError: '', isMedical: false,
    companyName: 'Clínica de teste', setPacienteFormData: vi.fn(), onClose: vi.fn(), onSubmit: vi.fn(),
    onOpenCbhpmModal: vi.fn(), onRemovePacienteProcedimento: vi.fn(), onPacienteFilesChange: vi.fn(),
    onRemovePendingPatientFile: vi.fn(), onDeletePacienteArquivo: vi.fn(), ...overrides,
  };
}

describe('PatientForm: permissões e operações em andamento', () => {
  it.each([null, basePaciente.id])('impede envio manual invertido, preserva valores e revalida ambas as datas (%s)', async editingPacienteId => {
    const submit = vi.fn(event => event.preventDefault());
    function Form() {
      const [data, setData] = useState<PacienteFormData>({ ...getPacienteFormData(basePaciente), data: '10/10/2026', dataAtendimento: '09/10/2026' });
      return <PatientForm {...props({ editingPacienteId, pacienteFormData: data, setPacienteFormData: setData, onSubmit: submit })} />;
    }
    const user = userEvent.setup();
    render(<Form />);
    const request = screen.getByLabelText('Data da Solicitação', { exact: true });
    const consolidated = screen.getByLabelText('Cirurgias Consolidadas', { exact: true });
    const picker = screen.getByLabelText('Selecionar cirurgias consolidadas');
    const message = 'A data da consolidação não pode ser anterior à data da solicitação.';
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(consolidated).toHaveAccessibleDescription(message);
    expect(consolidated).toHaveAttribute('aria-invalid', 'true');
    expect(picker).toHaveAttribute('min', '2026-10-10');
    expect(consolidated).toHaveValue('09/10/2026');
    await user.click(screen.getByRole('button', { name: editingPacienteId ? 'Salvar alterações' : 'Cadastrar paciente' }));
    expect(submit).not.toHaveBeenCalled();
    await user.clear(consolidated); await user.type(consolidated, '10102026');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: editingPacienteId ? 'Salvar alterações' : 'Cadastrar paciente' }));
    expect(submit).toHaveBeenCalledOnce();
    await user.clear(request); await user.type(request, '11102026');
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(consolidated).toHaveValue('10/10/2026');
    await user.clear(request);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(picker).not.toHaveAttribute('min');
    expect(consolidated).not.toHaveAttribute('required');
    expect(request).not.toHaveAttribute('required');
  });

  it('seleciona Urgência na edição e permite trocar o tipo de cirurgia', async () => {
    const input = props({ pacienteFormData: getPacienteFormData({ ...basePaciente, tipoCirurgia: 'Urgencia' }) });
    render(<PatientForm {...input} />);
    expect(screen.getByRole('radio', { name: 'Urgência' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Eletiva' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Eletiva' }));
    const update = vi.mocked(input.setPacienteFormData).mock.calls.at(-1)![0];
    expect(typeof update === 'function' ? update(input.pacienteFormData) : update).toMatchObject({ tipoCirurgia: 'Eletiva' });
  });

  it.each([{ patientReadOnly: true }, { canEditPatients: false }, { pacienteFormLoading: true }])('bloqueia tipo de cirurgia durante consulta ou salvamento %j', (state) => {
    render(<PatientForm {...props(state)} />);
    expect(screen.getByRole('radio', { name: 'Eletiva' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Urgência' })).toBeDisabled();
  });

  it.each([{ patientReadOnly: true }, { canEditPatients: false }])('preserva consulta sem permitir edição: %j', async (permissions) => {
    const input = props(permissions);
    render(<PatientForm {...input} />);
    expect(screen.getByRole('heading', { name: 'Visualizar paciente' })).toBeVisible();
    expect(screen.getByLabelText('Paciente', { exact: true })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Hospital' })).toBeDisabled();
    expect(screen.getByLabelText('Selecionar data da solicitação')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adicionar procedimento' })).toBeDisabled();
    expect(screen.queryByLabelText('Arquivos do paciente')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar ficha PDF' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar à listagem' }));
    expect(input.onClose).toHaveBeenCalledOnce();
  });

  it('bloqueia edição, saída e novos envios enquanto salva, sem perder os dados da ficha', async () => {
    const input = props({ pacienteFormLoading: true });
    const { container } = render(<PatientForm {...input} />);
    expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Paciente', { exact: true })).toHaveValue(basePaciente.nomePaciente);
    expect(screen.getByLabelText('Paciente', { exact: true })).toBeDisabled();
    expect(screen.getByLabelText('Arquivos do paciente')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar para lista' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Salvando...' }));
    expect(input.onSubmit).not.toHaveBeenCalled();
  });
});


describe('issue174: opcoes da equipe', () => {
  it('oferece principal como auxiliar e nao oferece auxiliar repetido', async () => {
    const input = props();
    input.pacienteFormData = { ...input.pacienteFormData, medicoUserId: 1, medico: 'Dra. Ana',
      medicoAuxiliar1UserId: null, medicoAuxiliar1: '', medicoAuxiliar2UserId: null, medicoAuxiliar2: '' };
    const { rerender } = render(<PatientForm {...input} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Médico auxiliar 1' }));
    expect(screen.getByRole('option', { name: 'Dra. Ana' })).toBeVisible();
    input.pacienteFormData = { ...input.pacienteFormData, medicoAuxiliar1UserId: 1, medicoAuxiliar1: 'Dra. Ana' };
    rerender(<PatientForm {...input} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Médico auxiliar 2' }));
    expect(screen.queryByRole('option', { name: 'Dra. Ana' })).not.toBeInTheDocument();
  });
});
