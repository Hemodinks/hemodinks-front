import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { mockSession } from '../../test/appTestData';
import { TEST_CURRENT_PASSWORD } from '../../test/passwordFixtures';
import type { PlatformClinic } from './clinicTypes';
import { ClinicFormPanel } from './ClinicFormPanel';
import { ClinicsTable } from './ClinicsTable';
import type { useClinicsController } from './useClinicsController';

type Controller = ReturnType<typeof useClinicsController>;

const clinic: PlatformClinic = {
  id: 2,
  nome: 'Clínica Recife',
  slug: 'clinica-recife',
  fotoUrl: null,
  ativa: true,
  plano: 'Parcial',
  modulosLiberados: ['pacientes'],
  assinaturaStatus: 'Ativa',
  limiteUsuarios: 10,
  usuarios: 3,
  dataCadastro: '2026-07-01T00:00:00Z',
};

function buildController(overrides: Partial<Controller> = {}) {
  return {
    clinics: [clinic],
    loading: false,
    saving: false,
    error: '',
    success: '',
    formOpen: false,
    editing: null,
    form: {
      nome: '',
      slug: '',
      ativa: true,
      plano: 'Trial',
      modulosLiberados: [],
      assinaturaStatus: 'Trial',
      trialAte: '',
      assinaturaValidaAte: '',
      limiteUsuarios: '5',
      fotoClinica: '',
      administradorNome: '',
      administradorEmail: '',
      administradorSenha: '',
      administradorTelefone: '',
    },
    setForm: vi.fn(),
    photoPreview: null,
    setPhotoPreview: vi.fn(),
    setFormOpen: vi.fn(),
    loadClinics: vi.fn(),
    openNew: vi.fn(),
    openEdit: vi.fn(),
    submit: vi.fn(),
    deactivate: vi.fn(),
    switchClinic: vi.fn(),
    handlePhotoChange: vi.fn(),
    ...overrides,
  } as unknown as Controller;
}

describe('componentes de clínicas', () => {
  it('mostra ações administrativas somente para clínicas elegíveis', async () => {
    const user = userEvent.setup();
    const controller = buildController();
    const session = mockSession({ clinicaId: 1 });

    render(<ClinicsTable controller={controller} session={session} isSuperAdmin />);

    expect(screen.getByText('Clínica Recife')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Acessar Clínica Recife' }));
    await user.click(screen.getByRole('button', { name: 'Editar Clínica Recife' }));
    await user.click(screen.getByRole('button', { name: 'Desativar Clínica Recife' }));
    expect(controller.switchClinic).toHaveBeenCalledWith(clinic);
    expect(controller.openEdit).toHaveBeenCalledWith(clinic);
    expect(controller.deactivate).toHaveBeenCalledWith(clinic);
  });

  it('mantém o formulário controlado ao configurar um plano parcial', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [form, setForm] = useState<Controller['form']>({
        nome: 'Clínica Recife',
        slug: 'clinica-recife',
        ativa: true,
        plano: 'Parcial',
        modulosLiberados: ['pacientes'],
        assinaturaStatus: 'Ativa',
        trialAte: '',
        assinaturaValidaAte: '',
        limiteUsuarios: '10',
        fotoClinica: '',
        administradorNome: 'Administrador',
        administradorEmail: 'admin@clinica.com',
        administradorSenha: TEST_CURRENT_PASSWORD,
        administradorTelefone: '',
      });
      const controller = buildController({
        form,
        setForm,
      });
      return <ClinicFormPanel controller={controller} isSuperAdmin />;
    }

    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Módulos contratados' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Agenda e notificações' }));
    expect(screen.getByRole('checkbox', { name: 'Agenda e notificações' })).toBeChecked();
    await user.selectOptions(screen.getByLabelText('Plano'), 'Trial');
    expect(screen.getByLabelText('Trial ate')).toBeInTheDocument();
  });
});
