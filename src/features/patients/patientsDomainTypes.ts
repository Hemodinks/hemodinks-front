import type { AppView, ModuleMode } from '../../appTypes';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import type { FormView } from '../../routes';
import type { AuthSession } from '../../types';

export type UsePatientsDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  companyName: string;
  isAdmin: boolean;
  isMedical: boolean;
  canAccessPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canConsultCbhpm: boolean;
  patientReadOnly: boolean;
  formRecordId: number | null;
  navigateToForm: (view: FormView, recordId?: number | null, replace?: boolean) => void;
  navigateToView: (view: AppView, replace?: boolean) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  confirmAction: ConfirmAction;
};
