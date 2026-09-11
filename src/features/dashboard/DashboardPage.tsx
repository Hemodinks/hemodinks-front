import { type CSSProperties, type DragEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleCheck,
  FileText,
  GripVertical,
  Info,
  Users,
} from 'lucide-react';
import './dashboard.css';
import { APP_MODULES } from '../../shared/navigation/appModules';
import { AlertMessage, ToastMessage } from '../../shared/components/ui';
import { hasPreferenceConsent } from '../../shared/privacy/consentStorage';

type DashboardPageProps = {
  companyName: string;
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

type DashboardModuleId = 'users' | 'profile' | 'patients' | 'billing' | 'tutorials' | 'medicalGroups' | 'agenda' | 'clinics' | 'settings';

type DashboardModule = {
  id: DashboardModuleId;
  metric: string;
  footerLabel: string;
  className: string;
  ariaLabel: string;
  onOpen: () => void;
  badge?: string;
};

const DASHBOARD_MODULE_ORDER_KEY = 'hemodinks.dashboard.module-order';
const DASHBOARD_DEFAULT_MODULE_ORDER: DashboardModuleId[] = ['users', 'profile', 'patients', 'billing', 'tutorials', 'medicalGroups', 'agenda', 'clinics', 'settings'];

function readStoredDashboardModuleOrder() {
  if (typeof window === 'undefined' || !hasPreferenceConsent()) {
    return [...DASHBOARD_DEFAULT_MODULE_ORDER];
  }

  try {
    const rawValue = localStorage.getItem(DASHBOARD_MODULE_ORDER_KEY);

    if (!rawValue) {
      return [...DASHBOARD_DEFAULT_MODULE_ORDER];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [...DASHBOARD_DEFAULT_MODULE_ORDER];
    }

    return parsed.filter((value): value is DashboardModuleId => DASHBOARD_DEFAULT_MODULE_ORDER.includes(value as DashboardModuleId));
  } catch {
    return [...DASHBOARD_DEFAULT_MODULE_ORDER];
  }
}

function normalizeDashboardModuleOrder(currentOrder: DashboardModuleId[], visibleModuleIds: DashboardModuleId[]) {
  return [
    ...currentOrder.filter((moduleId) => visibleModuleIds.includes(moduleId)),
    ...visibleModuleIds.filter((moduleId) => !currentOrder.includes(moduleId)),
  ];
}

function sameDashboardModuleOrder(left: DashboardModuleId[], right: DashboardModuleId[]) {
  return left.length === right.length && left.every((moduleId, index) => moduleId === right[index]);
}

function reorderDashboardModuleOrder(currentOrder: DashboardModuleId[], draggedModuleId: DashboardModuleId, targetModuleId: DashboardModuleId) {
  const nextOrder = [...currentOrder];
  const draggedIndex = nextOrder.indexOf(draggedModuleId);
  const targetIndex = nextOrder.indexOf(targetModuleId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return currentOrder;
  }

  nextOrder.splice(draggedIndex, 1);
  nextOrder.splice(targetIndex, 0, draggedModuleId);

  return nextOrder;
}

export function DashboardPage({
  companyName,
  canAccessPatients,
  canAccessUsers,
  canEditOwnUser,
  canAccessBilling,
  canAccessMedicalGroups,
  canAccessAgenda,
  canAccessSettings,
  canAccessClinics,
  patientReadOnly,
  usersCount,
  pacientesCount,
  activeUsersCount,
  activePatientsCount,
  pendingPaymentsCount,
  patientFilesCount,
  upcomingEventsCount,
  unreadAgendaNotificationCount,
  successMessage,
  dashboardError,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
  onOpenBilling,
  onOpenTutorials,
  onOpenMedicalGroups,
  onOpenAgenda,
  onOpenSettings,
  onOpenClinics,
}: DashboardPageProps) {
  const [moduleOrder, setModuleOrder] = useState<DashboardModuleId[]>(() => readStoredDashboardModuleOrder());
  const [draggedModuleId, setDraggedModuleId] = useState<DashboardModuleId | null>(null);
  const [dropTargetModuleId, setDropTargetModuleId] = useState<DashboardModuleId | null>(null);

  const availableModules: DashboardModule[] = [
    ...(canAccessUsers
      ? [{
          id: 'users' as const,
          metric: 'Gerenciar usuários',
          footerLabel: `${usersCount} cadastrados`,
          className: 'module-card-users',
          ariaLabel: 'Abrir usuários',
          onOpen: onOpenUsersList,
        }]
      : []),
    ...(canEditOwnUser
      ? [{
          id: 'profile' as const,
          metric: 'Dados e documentos',
          footerLabel: 'Editar registro',
          className: 'module-card-profile',
          ariaLabel: 'Abrir meu cadastro',
          onOpen: onOpenMyProfile,
        }]
      : []),
    ...(canAccessPatients
      ? [{
          id: 'patients' as const,
          metric: patientReadOnly ? 'Visualizar cadastro' : 'Administrar atendimentos',
          footerLabel: `${pacientesCount} cadastrados`,
          className: 'module-card-patients',
          ariaLabel: 'Abrir pacientes',
          onOpen: onOpenPatientsList,
        }]
      : []),
    ...(canAccessBilling
      ? [{
          id: 'billing' as const,
          metric: 'Honorários, glosas e repasses',
          footerLabel: `${pendingPaymentsCount} pendências financeiras`,
          className: 'module-card-billing',
          ariaLabel: 'Abrir faturamento médico',
          onOpen: onOpenBilling,
        }]
      : []),
    {
      id: 'tutorials',
      metric: 'Aprenda os fluxos do sistema',
      footerLabel: '12 tutoriais disponíveis',
      className: 'module-card-tutorials',
      ariaLabel: 'Abrir tutoriais interativos',
      onOpen: onOpenTutorials,
    },
    ...(canAccessMedicalGroups
      ? [{
          id: 'medicalGroups' as const,
          metric: 'Relacionar equipes e escopos',
          footerLabel: 'Definir compartilhamento',
          className: 'module-card-medical-groups',
          ariaLabel: 'Abrir grupos médicos',
          onOpen: onOpenMedicalGroups,
        }]
      : []),
    ...(canAccessAgenda
      ? [{
          id: 'agenda' as const,
          metric: 'Eventos, lembretes e avisos',
          footerLabel: `${upcomingEventsCount} próximos`,
          className: 'module-card-agenda',
          ariaLabel: 'Abrir agenda e notificações',
          onOpen: onOpenAgenda,
          badge: unreadAgendaNotificationCount > 0 ? `${unreadAgendaNotificationCount} não lidas` : undefined,
        }]
      : []),
    ...(canAccessClinics
      ? [{
          id: 'clinics' as const,
          metric: 'Gestão da plataforma',
          footerLabel: 'Administrar clínicas',
          className: 'module-card-clinics',
          ariaLabel: 'Abrir clínicas',
          onOpen: onOpenClinics,
        }]
      : []),
    ...(canAccessSettings
      ? [{
          id: 'settings' as const,
          metric: 'Configurações e monitoramento',
          footerLabel: 'Gerenciar opções',
          className: 'module-card-settings',
          ariaLabel: 'Abrir opções',
          onOpen: onOpenSettings,
        }]
      : []),
  ];
  const visibleModuleIds = availableModules.map((module) => module.id);
  const normalizedModuleOrder = normalizeDashboardModuleOrder(moduleOrder, visibleModuleIds);
  const orderedModules = [...availableModules].sort(
    (left, right) => normalizedModuleOrder.indexOf(left.id) - normalizedModuleOrder.indexOf(right.id),
  );
  const visibleModuleIdsKey = visibleModuleIds.join('|');
  const normalizedModuleOrderKey = normalizedModuleOrder.join('|');

  useEffect(() => {
    if (!sameDashboardModuleOrder(moduleOrder, normalizedModuleOrder)) {
      setModuleOrder(normalizedModuleOrder);
    }
  }, [moduleOrder, normalizedModuleOrder, visibleModuleIdsKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasPreferenceConsent()) {
      return;
    }

    localStorage.setItem(DASHBOARD_MODULE_ORDER_KEY, JSON.stringify(normalizedModuleOrder));
  }, [normalizedModuleOrderKey]);

  const handleDragStart = (moduleId: DashboardModuleId) => (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', moduleId);
    setDraggedModuleId(moduleId);
    setDropTargetModuleId(moduleId);
  };

  const handleDragOver = (moduleId: DashboardModuleId) => (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (draggedModuleId && draggedModuleId !== moduleId) {
      setDropTargetModuleId(moduleId);
    }
  };

  const handleDragEnter = (moduleId: DashboardModuleId) => (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (draggedModuleId && draggedModuleId !== moduleId) {
      setDropTargetModuleId(moduleId);
    }
  };

  const handleDrop = (moduleId: DashboardModuleId) => (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const droppedModuleId = (event.dataTransfer.getData('text/plain') || draggedModuleId) as DashboardModuleId | null;

    if (!droppedModuleId || droppedModuleId === moduleId) {
      setDraggedModuleId(null);
      setDropTargetModuleId(null);
      return;
    }

    setModuleOrder((current) => reorderDashboardModuleOrder(
      normalizeDashboardModuleOrder(current, visibleModuleIds),
      droppedModuleId,
      moduleId,
    ));
    setDraggedModuleId(null);
    setDropTargetModuleId(null);
  };

  const clearDragState = () => {
    setDraggedModuleId(null);
    setDropTargetModuleId(null);
  };

  return (
    <section className="dashboard-workspace">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Acesso rápido</span>
          <h2>Módulos da clínica</h2>
          <p>{companyName}</p>
        </div>
      </div>

      {successMessage && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{successMessage}</ToastMessage>}
      {dashboardError && <AlertMessage type="error">{dashboardError}</AlertMessage>}

      <div className="module-grid">
        {orderedModules.map((module) => (
          <button
            key={module.id}
            type="button"
            className={`module-card ${module.className}${draggedModuleId === module.id ? ' is-dragging' : ''}${dropTargetModuleId === module.id && draggedModuleId !== module.id ? ' is-drop-target' : ''}`}
            style={{ '--module-color': APP_MODULES[module.id].color } as CSSProperties}
            onClick={module.onOpen}
            onDragEnter={handleDragEnter(module.id)}
            onDragOver={handleDragOver(module.id)}
            onDrop={handleDrop(module.id)}
            aria-label={module.ariaLabel}
            aria-grabbed={draggedModuleId === module.id}
          >
            <span
              className="module-card-menu"
              aria-hidden="true"
              title="Arraste para reorganizar"
              draggable
              onClick={(event) => event.stopPropagation()}
              onDragStart={handleDragStart(module.id)}
              onDragEnd={clearDragState}
            >
              <GripVertical size={20} />
            </span>
            <span className="module-icon" aria-hidden="true">{(() => { const Icon = APP_MODULES[module.id].icon; return <Icon size={24} />; })()}</span>
            <span className="module-title">{APP_MODULES[module.id].title}</span>
            <span className="module-metric">{module.metric}</span>
            <span className="module-card-foot">
              <span>{module.footerLabel}</span>
              {module.badge && <span className="module-badge">{module.badge}</span>}
              <ArrowRight size={20} />
            </span>
          </button>
        ))}
      </div>

      <section className="dashboard-info-panel" aria-label="Painel informativo">
        <div className="dashboard-info-title">
          <span className="eyebrow">Painel informativo</span>
          <h3>Resumo geral</h3>
        </div>

        <div className="info-summary-grid">
          {canAccessUsers && (
            <div className="info-summary-item info-summary-users">
              <span className="info-summary-icon"><Users size={18} /></span>
              <span className="info-summary-label">Usuários ativos</span>
              <strong>{activeUsersCount}</strong>
            </div>
          )}
          <div className="info-summary-item info-summary-patients">
            <span className="info-summary-icon"><CircleCheck size={18} /></span>
            <span className="info-summary-label">Pacientes ativos</span>
            <strong>{activePatientsCount}</strong>
          </div>
          <div className="info-summary-item info-summary-pending">
            <span className="info-summary-icon amber"><Info size={18} /></span>
            <span className="info-summary-label">Pendencias</span>
            <strong>{pendingPaymentsCount}</strong>
          </div>
          <div className="info-summary-item info-summary-files">
            <span className="info-summary-icon"><FileText size={18} /></span>
            <span className="info-summary-label">Arquivos</span>
            <strong>{patientFilesCount}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
