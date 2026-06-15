export type Theme = 'light' | 'dark';

export type AppView = 'dashboard' | 'users' | 'profile' | 'patients' | 'agenda';

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
  medico: string;
  convenio: string;
  procedimento: string;
};

export type PacienteExportFormat = 'xlsx' | 'pdf';

export type PacienteExportScope = 'all' | 'doctor' | 'visible';
