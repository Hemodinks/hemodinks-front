import { describe, expect, it } from 'vitest';
import { mockSession } from '../test/appTestData';
import { getAppAccess } from './appAccess';

type ExpectedAccess = {
  canAccessDashboard: boolean;
  canAccessPatients: boolean;
  canCreatePatients: boolean;
  canDeletePatients: boolean;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
  canAccessAgenda: boolean;
  canAccessSettings: boolean;
  canAccessClinics: boolean;
};

const cases: Array<[string, number, ExpectedAccess]> = [
  ['Administrador', 1, {
    canAccessDashboard: true,
    canAccessPatients: true,
    canCreatePatients: true,
    canDeletePatients: true,
    canAccessUsers: true,
    canEditOwnUser: false,
    canAccessBilling: true,
    canAccessMedicalGroups: true,
    canAccessAgenda: true,
    canAccessSettings: true,
    canAccessClinics: false,
  }],
  ['Médicos', 2, {
    canAccessDashboard: true,
    canAccessPatients: true,
    canCreatePatients: true,
    canDeletePatients: false,
    canAccessUsers: false,
    canEditOwnUser: true,
    canAccessBilling: true,
    canAccessMedicalGroups: false,
    canAccessAgenda: true,
    canAccessSettings: false,
    canAccessClinics: false,
  }],
  ['Pacientes', 3, {
    canAccessDashboard: true,
    canAccessPatients: true,
    canCreatePatients: false,
    canDeletePatients: false,
    canAccessUsers: false,
    canEditOwnUser: true,
    canAccessBilling: false,
    canAccessMedicalGroups: false,
    canAccessAgenda: true,
    canAccessSettings: false,
    canAccessClinics: false,
  }],
  ['Controller', 4, {
    canAccessDashboard: true,
    canAccessPatients: true,
    canCreatePatients: true,
    canDeletePatients: false,
    canAccessUsers: false,
    canEditOwnUser: false,
    canAccessBilling: true,
    canAccessMedicalGroups: true,
    canAccessAgenda: true,
    canAccessSettings: false,
    canAccessClinics: false,
  }],
  ['SuperAdministrador', 5, {
    canAccessDashboard: true,
    canAccessPatients: true,
    canCreatePatients: true,
    canDeletePatients: true,
    canAccessUsers: true,
    canEditOwnUser: false,
    canAccessBilling: true,
    canAccessMedicalGroups: true,
    canAccessAgenda: true,
    canAccessSettings: true,
    canAccessClinics: true,
  }],
];

describe('matriz de acesso da interface por perfil', () => {
  it.each(cases)('%s possui apenas os acessos esperados', (perfilNome, perfilId, expected) => {
    const access = getAppAccess(mockSession({ perfilId, perfilNome }));

    expect(access).toMatchObject(expected);
  });

  it('plano parcial restringe módulos operacionais sem remover administração da plataforma', () => {
    const access = getAppAccess(mockSession({
      perfilId: 5,
      perfilNome: 'SuperAdministrador',
      modulosLiberados: ['pacientes'],
    }));

    expect(access.canAccessPatients).toBe(true);
    expect(access.canDeletePatients).toBe(true);
    expect(access.canAccessUsers).toBe(false);
    expect(access.canAccessBilling).toBe(false);
    expect(access.canAccessMedicalGroups).toBe(false);
    expect(access.canAccessAgenda).toBe(false);
    expect(access.canAccessClinics).toBe(true);
    expect(access.canAccessSettings).toBe(true);
  });
});
