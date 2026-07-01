import { type DragEvent, type ReactNode, useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  FileText,
  GripVertical,
  Info,
  Settings,
  ShieldPlus,
  Users,
} from 'lucide-react';
import './dashboard.css';

type DashboardPageProps = {
  companyName: string;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
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
  onOpenMedicalGroups: () => void;
  onOpenAgenda: () => void;
  onOpenSettings: () => void;
};

type DashboardModuleId = 'users' | 'profile' | 'patients' | 'billing' | 'medicalGroups' | 'agenda' | 'settings';

type DashboardModule = {
  id: DashboardModuleId;
  title: string;
  metric: string;
  footerLabel: string;
  className: string;
  ariaLabel: string;
  icon: ReactNode;
  onOpen: () => void;
  badge?: string;
};

const DASHBOARD_MODULE_ORDER_KEY = 'hemodinks.dashboard.module-order';
const DASHBOARD_DEFAULT_MODULE_ORDER: DashboardModuleId[] = ['users', 'profile', 'patients', 'billing', 'medicalGroups', 'agenda', 'settings'];

function readStoredDashboardModuleOrder() {
  if (typeof window === 'undefined') {
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
  canAccessUsers,
  canEditOwnUser,
  canAccessBilling,
  canAccessMedicalGroups,
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
  onOpenMedicalGroups,
  onOpenAgenda,
  onOpenSettings,
}: DashboardPageProps) {
  const [moduleOrder, setModuleOrder] = useState<DashboardModuleId[]>(() => readStoredDashboardModuleOrder());
  const [draggedModuleId, setDraggedModuleId] = useState<DashboardModuleId | null>(null);
  const [dropTargetModuleId, setDropTargetModuleId] = useState<DashboardModuleId | null>(null);

  const availableModules: DashboardModule[] = [
    ...(canAccessUsers
      ? [{
          id: 'users' as const,
          title: 'Usuarios',
          metric: 'Gerenciar usuarios',
          footerLabel: `${usersCount} cadastrados`,
          className: 'module-card-users',
          ariaLabel: 'Abrir usuarios',
          icon: <Users size={24} />,
          onOpen: onOpenUsersList,
        }]
      : []),
    ...(canEditOwnUser
      ? [{
          id: 'profile' as const,
          title: 'Meu cadastro',
          metric: 'Dados e documentos',
          footerLabel: 'Editar registro',
          className: 'module-card-profile',
          ariaLabel: 'Abrir meu cadastro',
          icon: <FileText size={24} />,
          onOpen: onOpenMyProfile,
        }]
      : []),
    {
      id: 'patients',
      title: 'Pacientes',
      metric: patientReadOnly ? 'Visualizar cadastro' : 'Administrar atendimentos',
      footerLabel: `${pacientesCount} cadastrados`,
      className: 'module-card-patients',
      ariaLabel: 'Abrir pacientes',
      icon: <ClipboardList size={24} />,
      onOpen: onOpenPatientsList,
    },
    ...(canAccessBilling
      ? [{
          id: 'billing' as const,
          title: 'Faturamento medico',
          metric: 'Honorarios, glosas e repasses',
          footerLabel: `${pendingPaymentsCount} pendencias financeiras`,
          className: 'module-card-billing',
          ariaLabel: 'Abrir faturamento medico',
          icon: <FileText size={24} />,
          onOpen: onOpenBilling,
        }]
      : []),
    ...(canAccessMedicalGroups
      ? [{
          id: 'medicalGroups' as const,
          title: 'Grupos medicos',
          metric: 'Relacionar equipes e escopos',
          footerLabel: 'Definir compartilhamento',
          className: 'module-card-medical-groups',
          ariaLabel: 'Abrir grupos medicos',
          icon: <ShieldPlus size={24} />,
          onOpen: onOpenMedicalGroups,
        }]
      : []),
    {
      id: 'agenda',
      title: 'Agenda e notificacoes',
      metric: 'Eventos, lembretes e avisos',
      footerLabel: `${upcomingEventsCount} proximos`,
      className: 'module-card-agenda',
      ariaLabel: 'Abrir agenda e notificacoes',
      icon: <CalendarDays size={24} />,
      onOpen: onOpenAgenda,
      badge: unreadAgendaNotificationCount > 0 ? `${unreadAgendaNotificationCount} nao lidas` : undefined,
    },
    {
      id: 'settings',
      title: 'Configuracao do sistema',
      metric: 'Senha, tema e marca',
      footerLabel: 'Ajustar preferencias',
      className: 'module-card-settings',
      ariaLabel: 'Abrir configuracao do sistema',
      icon: <Settings size={24} />,
      onOpen: onOpenSettings,
    },
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
    if (typeof window === 'undefined') {
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
          <span className="eyebrow">Modulos</span>
          <h2>Cadastros {companyName}</h2>
        </div>
      </div>

      {successMessage && <p className="alert success"><CheckCircle2 size={17} />{successMessage}</p>}
      {dashboardError && <p className="alert error">{dashboardError}</p>}

      <div className="module-grid">
        {orderedModules.map((module) => (
          <button
            key={module.id}
            type="button"
            className={`module-card ${module.className}${draggedModuleId === module.id ? ' is-dragging' : ''}${dropTargetModuleId === module.id && draggedModuleId !== module.id ? ' is-drop-target' : ''}`}
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
            <span className="module-icon">{module.icon}</span>
            <span className="module-title">{module.title}</span>
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
              <span className="info-summary-label">Usuarios ativos</span>
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
