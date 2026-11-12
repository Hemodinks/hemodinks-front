import type { AppView, ModuleMode } from '../../appTypes';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import type { FormView } from '../../routes';
import type { AuthSession } from '../../types';

export type UseUsersDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  isAdmin: boolean;
  formRecordId: number | null;
  navigateToForm: (view: FormView, recordId?: number | null, replace?: boolean) => void;
  navigateToView: (view: AppView, replace?: boolean) => void;
  persistSession: (nextSession: AuthSession) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  onDeleteCurrentUser: () => void;
  onIdentityChanged: (message: string) => void;
  confirmAction: ConfirmAction;
};
