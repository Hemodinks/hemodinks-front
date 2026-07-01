import type { CbhpmFilters, PacienteFilters } from '../appTypes';

export const queryKeys = {
  systemSettings: () => ['systemSettings'] as const,
  dashboardSummary: (token: string) => ['dashboardSummary', token] as const,
  dashboardNotifications: (token: string) => ['dashboardNotifications', token] as const,
  users: (token: string, query?: { page: number; pageSize: number; search: string }) => ['users', token, query] as const,
  usersRoot: (token: string) => ['users', token] as const,
  medicalUsers: (token: string) => ['medicalUsers', token] as const,
  medicalGroups: (token: string, query?: { page: number; pageSize: number; search: string; sortBy: string; sortDirection: 'asc' | 'desc' }) => ['medicalGroups', token, query] as const,
  medicalGroupsRoot: (token: string) => ['medicalGroups', token] as const,
  pacientes: (
    token: string,
    query?: { page: number; pageSize: number; search: string } & Partial<PacienteFilters>,
  ) => ['pacientes', token, query] as const,
  pacientesRoot: (token: string) => ['pacientes', token] as const,
  pacienteObservacoes: (token: string, pacienteId: number) => ['pacienteObservacoes', token, pacienteId] as const,
  pacienteObservacoesRoot: (token: string) => ['pacienteObservacoes', token] as const,
  hospitais: (token: string) => ['hospitais', token] as const,
  convenios: (token: string) => ['convenios', token] as const,
  opmeFornecedores: (token: string) => ['opmeFornecedores', token] as const,
  cbhpm: (
    token: string,
    query?: { page: number; pageSize: number } & CbhpmFilters,
  ) => ['cbhpm', token, query] as const,
  cbhpmCache: (token: string) => ['cbhpm', token, 'cache'] as const,
};
