import type { Dispatch, SetStateAction } from 'react';
import type { AppView, ModuleMode } from '../../appTypes';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import type { AuthSession } from '../../types';

export type UseUsersDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  isAdmin: boolean;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  persistSession: (nextSession: AuthSession) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  onDeleteCurrentUser: () => void;
  confirmAction: ConfirmAction;
};
