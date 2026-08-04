import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Settings,
  ShieldPlus,
  Users,
} from 'lucide-react';
import type { DashboardModule, DashboardPageProps } from './dashboardTypes';

export function buildDashboardModules(props: DashboardPageProps): DashboardModule[] {
  return [
    ...(props.canAccessUsers
      ? [
          {
            id: 'users' as const,
            title: 'Usuários',
            metric: 'Gerenciar usuários',
            footerLabel: `${props.usersCount} cadastrados`,
            className: 'module-card-users',
            ariaLabel: 'Abrir usuários',
            icon: <Users size={24} />,
            onOpen: props.onOpenUsersList,
          },
        ]
      : []),
    ...(props.canEditOwnUser
      ? [
          {
            id: 'profile' as const,
            title: 'Meu cadastro',
            metric: 'Dados e documentos',
            footerLabel: 'Editar registro',
            className: 'module-card-profile',
            ariaLabel: 'Abrir meu cadastro',
            icon: <FileText size={24} />,
            onOpen: props.onOpenMyProfile,
          },
        ]
      : []),
    ...(props.canAccessPatients
      ? [
          {
            id: 'patients' as const,
            title: 'Pacientes',
            metric: props.patientReadOnly ? 'Visualizar cadastro' : 'Administrar atendimentos',
            footerLabel: `${props.pacientesCount} cadastrados`,
            className: 'module-card-patients',
            ariaLabel: 'Abrir pacientes',
            icon: <ClipboardList size={24} />,
            onOpen: props.onOpenPatientsList,
          },
        ]
      : []),
    ...(props.canAccessBilling
      ? [
          {
            id: 'controller' as const,
            title: 'Controladoria',
            metric: 'Atendimentos, faturamento e financeiro',
            footerLabel: `${props.pendingPaymentsCount} pendências financeiras`,
            className: 'module-card-controller',
            ariaLabel: 'Abrir Controladoria',
            icon: <FileText size={24} />,
            onOpen: props.onOpenController,
          },
        ]
      : []),
    ...(props.canAccessClinics
      ? [
          {
            id: 'clinics' as const,
            title: 'Clínicas',
            metric: props.isSuperAdmin
              ? 'Administrar todas as clínicas'
              : 'Editar dados da clínica',
            footerLabel: props.isSuperAdmin ? 'Gestão da plataforma' : 'Clínica atual',
            className: 'module-card-clinics',
            ariaLabel: 'Abrir cadastro de clínicas',
            icon: <Building2 size={24} />,
            onOpen: props.onOpenClinics,
          },
        ]
      : []),
    ...(props.canAccessMedicalGroups
      ? [
          {
            id: 'medicalGroups' as const,
            title: 'Grupos médicos',
            metric: 'Relacionar equipes e escopos',
            footerLabel: 'Definir compartilhamento',
            className: 'module-card-medical-groups',
            ariaLabel: 'Abrir grupos médicos',
            icon: <ShieldPlus size={24} />,
            onOpen: props.onOpenMedicalGroups,
          },
        ]
      : []),
    ...(props.canAccessAgenda
      ? [
          {
            id: 'agenda' as const,
            title: 'Agenda e notificações',
            metric: 'Eventos, lembretes e avisos',
            footerLabel: `${props.upcomingEventsCount} próximos`,
            className: 'module-card-agenda',
            ariaLabel: 'Abrir agenda e notificações',
            icon: <CalendarDays size={24} />,
            onOpen: props.onOpenAgenda,
            badge:
              props.unreadAgendaNotificationCount > 0
                ? `${props.unreadAgendaNotificationCount} não lidas`
                : undefined,
          },
        ]
      : []),
    ...(props.canAccessSettings
      ? [
          {
            id: 'settings' as const,
            title: 'Configuração do sistema',
            metric: 'Senha, tema e marca',
            footerLabel: 'Ajustar preferências',
            className: 'module-card-settings',
            ariaLabel: 'Abrir configuração do sistema',
            icon: <Settings size={24} />,
            onOpen: props.onOpenSettings,
          },
        ]
      : []),
  ];
}
