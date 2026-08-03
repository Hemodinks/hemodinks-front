import { describe, expect, it, vi } from 'vitest';
import { queryClient } from '../queryClient';
import { useAppNavigation } from './useAppNavigation';

function createOptions() {
  const usersDomain = {
    openMyProfile: vi.fn(),
    resetUserFormState: vi.fn(),
    setCurrentPage: vi.fn(),
    setSortBy: vi.fn(),
    setSortDirection: vi.fn(),
    sortBy: 'name',
  };
  const patientsDomain = {
    cbhpmSortBy: 'codigo',
    openPatientsList: vi.fn(),
    setCbhpmCurrentPage: vi.fn(),
    setCbhpmSortBy: vi.fn(),
    setCbhpmSortDirection: vi.fn(),
    setPacienteCurrentPage: vi.fn(),
    setSortBy: vi.fn(),
    setSortDirection: vi.fn(),
    sortBy: 'name',
  };
  const medicalGroupsDomain = {
    openMedicalGroupsList: vi.fn(),
    setCurrentPage: vi.fn(),
    setSortBy: vi.fn(),
    setSortDirection: vi.fn(),
    sortBy: 'name',
  };
  const options = {
    access: {
      canAccessAgenda: true,
      canAccessBilling: true,
      canAccessClinics: true,
      canAccessDashboard: true,
      canAccessMedicalGroups: true,
      canAccessPatients: true,
      canAccessPrices: true,
      canAccessSettings: true,
      canEditOwnUser: true,
      isMedical: false,
    },
    activeView: 'dashboard',
    appChrome: { resetAppChrome: vi.fn() },
    medicalGroupsDomain,
    navigateToView: vi.fn(),
    patientsDomain,
    persistSession: vi.fn(),
    session: {
      token: 'old-token',
      user: { id: 1, nome: 'Admin', clinicaId: 1 },
    },
    setModuleMode: vi.fn(),
    usersDomain,
  };

  return { medicalGroupsDomain, options, patientsDomain, usersDomain };
}

describe('useAppNavigation', () => {
  it('abre destinos permitidos e limpa o estado do perfil', () => {
    const { options, patientsDomain, medicalGroupsDomain, usersDomain } = createOptions();
    options.activeView = 'profile';
    const navigation = useAppNavigation(options as never);

    navigation.openAgenda();
    navigation.openPatientsListFromMenu();
    navigation.openMedicalGroups();
    navigation.openBilling();
    navigation.openSettings();
    navigation.openAttendances();
    navigation.openFinance();
    navigation.openPrices();
    navigation.openClinics();

    expect(usersDomain.resetUserFormState).toHaveBeenCalledWith({
      suppressProfileAutoOpen: true,
    });
    expect(patientsDomain.openPatientsList).toHaveBeenCalledOnce();
    expect(medicalGroupsDomain.openMedicalGroupsList).toHaveBeenCalledOnce();
    expect(options.navigateToView.mock.calls.map(([view]) => view)).toEqual([
      'agenda',
      'billing',
      'settings',
      'attendances',
      'finance',
      'prices',
      'clinics',
    ]);
  });

  it('redireciona acessos negados para o primeiro módulo disponível', () => {
    const { options, patientsDomain } = createOptions();
    Object.assign(options.access, {
      canAccessAgenda: false,
      canAccessBilling: false,
      canAccessClinics: false,
      canAccessDashboard: false,
      canAccessMedicalGroups: false,
      canAccessPrices: false,
      canAccessSettings: false,
    });
    const navigation = useAppNavigation(options as never);

    navigation.openAgenda();
    navigation.openBilling();
    navigation.openClinics();

    expect(patientsDomain.openPatientsList).toHaveBeenCalledTimes(3);
    expect(options.navigateToView).not.toHaveBeenCalled();
  });

  it('seleciona clínica, limpa caches e atualiza a sessão', () => {
    const { options } = createOptions();
    const clear = vi.spyOn(queryClient, 'clear');
    const navigation = useAppNavigation(options as never);

    navigation.handleClinicSelected({
      token: 'new-token',
      clinica: {
        userId: 9,
        clinicaId: 7,
        slug: 'centro',
        perfilId: 3,
        perfil: 'Gestor',
        modulosLiberados: ['dashboard'],
      },
    } as never);

    expect(clear).toHaveBeenCalledOnce();
    expect(options.appChrome.resetAppChrome).toHaveBeenCalledOnce();
    expect(options.persistSession).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'new-token',
        user: expect.objectContaining({ id: 9, clinicaId: 7, clinicaSlug: 'centro' }),
      }),
    );
    expect(options.navigateToView).toHaveBeenCalledWith('dashboard', true);
  });

  it('ignora troca de clínica sem sessão e atualiza ordenações', () => {
    const { options, patientsDomain, usersDomain, medicalGroupsDomain } = createOptions();
    options.session = null as never;
    const navigation = useAppNavigation(options as never);

    navigation.handleClinicSelected({} as never);
    navigation.handleUserSortChange('recent');
    navigation.handlePacienteSortChange('recent');
    navigation.handleCbhpmSortChange('descricao');
    navigation.handleMedicalGroupSortChange('recent');

    expect(options.persistSession).not.toHaveBeenCalled();
    expect(usersDomain.setSortDirection).toHaveBeenCalledWith('desc');
    expect(patientsDomain.setSortDirection).toHaveBeenCalledWith('desc');
    expect(patientsDomain.setCbhpmSortDirection).toHaveBeenCalledWith('asc');
    expect(medicalGroupsDomain.setSortDirection).toHaveBeenCalledWith('desc');
  });
});
