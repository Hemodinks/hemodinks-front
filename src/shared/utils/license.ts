import type { SessionUser } from '../../types';
import {
  CONTROLLER_PROFILE_ID,
  MEDICAL_PROFILE_ID,
  PATIENT_PROFILE_ID,
} from './formatters';

const ADMIN_PROFILE_ID = 1;

export const LICENSE_FEATURES = {
  dashboardVisualizar: 'Dashboard.Visualizar',
  pacientesVisualizar: 'Pacientes.Visualizar',
  pacientesGerenciar: 'Pacientes.Gerenciar',
  cbhpmConsultar: 'Cbhpm.Consultar',
} as const;

const ADMIN_FEATURES = new Set<string>([
  LICENSE_FEATURES.dashboardVisualizar,
  LICENSE_FEATURES.pacientesVisualizar,
  LICENSE_FEATURES.pacientesGerenciar,
  LICENSE_FEATURES.cbhpmConsultar,
]);

const PATIENT_IMPLICIT_FEATURES = new Set<string>([
  LICENSE_FEATURES.dashboardVisualizar,
  LICENSE_FEATURES.pacientesVisualizar,
  LICENSE_FEATURES.cbhpmConsultar,
]);

const CONTROLLER_IMPLICIT_FEATURES = new Set<string>([
  LICENSE_FEATURES.dashboardVisualizar,
  LICENSE_FEATURES.pacientesVisualizar,
  LICENSE_FEATURES.pacientesGerenciar,
  LICENSE_FEATURES.cbhpmConsultar,
]);

const MEDICAL_FULL_FEATURES = new Set<string>([
  LICENSE_FEATURES.dashboardVisualizar,
  LICENSE_FEATURES.pacientesVisualizar,
  LICENSE_FEATURES.pacientesGerenciar,
  LICENSE_FEATURES.cbhpmConsultar,
]);

export function getSessionFeatures(user: SessionUser | null | undefined): ReadonlySet<string> {
  if (!user) {
    return new Set();
  }

  if (user.perfilId === ADMIN_PROFILE_ID) {
    return ADMIN_FEATURES;
  }

  if (user.perfilId === PATIENT_PROFILE_ID) {
    return PATIENT_IMPLICIT_FEATURES;
  }

  if (user.perfilId === CONTROLLER_PROFILE_ID) {
    return CONTROLLER_IMPLICIT_FEATURES;
  }

  if (user.perfilId === MEDICAL_PROFILE_ID) {
    return MEDICAL_FULL_FEATURES;
  }

  return new Set();
}

export function hasSessionFeature(
  user: SessionUser | null | undefined,
  feature: string,
) {
  return getSessionFeatures(user).has(feature);
}
