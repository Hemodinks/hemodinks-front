import { CheckCircle2, CircleCheck, FileText, Info, Users, UserPlus, CalendarDays, Wallet, UserRound } from 'lucide-react';
import './dashboard.css';
import { AlertMessage, ToastMessage } from '../../shared/components/ui';
import { APP_MODULES } from '../../shared/navigation/appModules';
import { DashboardStats } from './DashboardStats';
import { DashboardPendingItems } from './DashboardPendingItems';
import { DashboardQuickActions, type DashboardAction } from './DashboardQuickActions';

type DashboardPageProps = {
  companyName: string;
  userName?: string;
  loading?: boolean;
  summaryAvailable?: boolean;
  canCreatePatients?: boolean;
  onNewPatient?: () => void;
  canAccessPatients: boolean;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
  canAccessAgenda: boolean;
  canAccessSettings: boolean;
  canAccessClinics: boolean;
  patientReadOnly: boolean;
  usersCount: number;
  pacientesCount: number;
  activeUsersCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  upcomingEventsCount: number;
  unreadAgendaNotificationCount: number;
  successMessage: string;
  dashboardError: string;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenBilling: () => void;
  onOpenTutorials: () => void;
  onOpenMedicalGroups: () => void;
  onOpenAgenda: () => void;
  onOpenSettings: () => void;
  onOpenClinics: () => void;
};

export function DashboardPage(props: DashboardPageProps) {
  const { companyName, userName, loading = false, summaryAvailable = true, dashboardError,
    canAccessPatients, canAccessUsers, canAccessBilling, canAccessAgenda } = props;
  const available = summaryAvailable && !dashboardError;
  const actions: DashboardAction[] = [];
  if (canAccessPatients) actions.push(props.canCreatePatients && props.onNewPatient
    ? { label: 'Novo paciente', color: APP_MODULES.patients.color, icon: UserPlus, onOpen: props.onNewPatient }
    : { label: 'Consultar pacientes', color: APP_MODULES.patients.color, icon: CircleCheck, onOpen: props.onOpenPatientsList });
  if (canAccessBilling) actions.push({ label: 'Faturamento', color: APP_MODULES.billing.color, icon: Wallet, onOpen: props.onOpenBilling });
  if (canAccessAgenda) actions.push({ label: 'Agenda', color: APP_MODULES.agenda.color, icon: CalendarDays, onOpen: props.onOpenAgenda });
  if (canAccessUsers) actions.push({ label: 'Gerenciar usuários', color: APP_MODULES.users.color, icon: Users, onOpen: props.onOpenUsersList });
  else if (props.canEditOwnUser) actions.push({ label: 'Meu cadastro', color: APP_MODULES.profile.color, icon: UserRound, onOpen: props.onOpenMyProfile });

  const stats = [
    ...(canAccessPatients ? [{ label: 'Pacientes ativos', value: props.activePatientsCount, color: APP_MODULES.patients.color, icon: CircleCheck }] : []),
    ...(canAccessUsers ? [{ label: 'Usuários ativos', value: props.activeUsersCount, color: APP_MODULES.users.color, icon: Users }] : []),
    ...(canAccessBilling ? [{ label: 'Pendências financeiras', value: props.pendingPaymentsCount, color: '#b7791f', icon: Info }] : []),
    ...(canAccessPatients ? [{ label: 'Arquivos', value: props.patientFilesCount, color: APP_MODULES.settings.color, icon: FileText }] : []),
  ];

  return <section className="dashboard-workspace" aria-label="Visão geral da clínica">
    <div className="dashboard-header">
      <span className="eyebrow">Seu dia na clínica</span>
      <h2>{userName?.trim() ? `Olá, ${userName.trim().split(/\s+/)[0]}` : 'Olá'}</h2>
      <p>Visão geral de <strong>{companyName}</strong></p>
    </div>
    {props.successMessage && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{props.successMessage}</ToastMessage>}
    {dashboardError && <AlertMessage type="error">{dashboardError}</AlertMessage>}
    <DashboardStats items={stats} loading={loading} available={available} />
    {(canAccessBilling || canAccessAgenda) && <DashboardPendingItems
      canAccessBilling={canAccessBilling} canAccessAgenda={canAccessAgenda}
      pendingPaymentsCount={props.pendingPaymentsCount} upcomingEventsCount={props.upcomingEventsCount}
      unreadAgendaNotificationCount={props.unreadAgendaNotificationCount}
      loading={loading} available={available}
      onOpenBilling={props.onOpenBilling} onOpenAgenda={props.onOpenAgenda}
    />}
    <DashboardQuickActions actions={actions} />
    <p className="dashboard-help">Precisa de orientação? <button type="button" onClick={props.onOpenTutorials}>Explorar tutoriais interativos</button></p>
  </section>;
}
