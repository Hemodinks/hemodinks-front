import type { PagedResult } from './listQuery';

export type SystemSettings = {
  id: number;
  nomeEmpresa: string;
  fotoEmpresa?: string | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
};

export type UpdateSystemSettingsPayload = {
  nomeEmpresa: string;
  fotoEmpresa?: string | null;
};

export type MonitoringError = {
  timestamp: string;
  module: string;
  classFlow: string[];
  method: string;
  line?: number | null;
  technicalDescription: string;
  userName: string;
  userEmail: string;
  query?: string | null;
  databaseOperation?: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | null;
  requestId?: string | null;
};

export type MonitoringErrorPage = PagedResult<MonitoringError>;

// Safe presentation subset of SecurityObservation from API #148.
export type SecurityObservation = {
  timestamp: string;
  kind: string;
  operation: string;
  reason: string;
  clinicId: number | null;
};

export type SecurityObservationPage = {
  items: SecurityObservation[];
  page: number;
  pageSize: number;
};
