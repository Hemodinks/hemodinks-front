import type { TipoCirurgia } from './shared/surgeryType';
import type { StatusCirurgia } from './shared/surgeryStatus';
import type { PacienteSituacao } from './types';

export type Theme = 'light' | 'dark';

// "default" = cores padrão dos módulos; "neutral" = cores neutras (cor só no ícone e no filete).
export type ColorStyle = 'default' | 'neutral';

export type AppView = 'dashboard' | 'users' | 'profile' | 'patients' | 'patientAudit' | 'billing' | 'billingHistory' | 'reports' | 'tutorials' | 'medicalGroups' | 'agenda' | 'settings' | 'clinics';

export type ModuleMode = 'list' | 'form';

export type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

export type CbhpmFilters = {
  codigo: string;
  procedimento: string;
  porte: string;
};

export type PacienteFilters = {
  tipoCirurgia?: TipoCirurgia | '';
  statusCirurgia?: StatusCirurgia | '';
  medicoUserIds: number[];
  convenioIds: number[];
  procedimento: string;
  dataInicio: string;
  dataFinal: string;
  dataSolicitacaoInicio: string;
  dataSolicitacaoFinal: string;
  pendenciaDataConsolidacao?: boolean;
  situacao?: PacienteSituacao;
};

export type PacienteExportFormat = 'xlsx' | 'pdf';

export type PacienteExportScope = 'all' | 'doctor' | 'visible';
