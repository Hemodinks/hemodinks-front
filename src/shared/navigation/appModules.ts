import { BarChart3, Building2, CalendarClock, CalendarDays, ClipboardList, FileText, LayoutDashboard, PlayCircle, ReceiptText, Settings, ShieldPlus, Users } from 'lucide-react';

// Presentation only. Access remains derived from getAppAccess and session features.
export const APP_MODULES = {
  dashboard: { title: 'Painel', navLabel: 'Painel', icon: LayoutDashboard, color: '#0f766e' },
  users: { title: 'Usuários', navLabel: 'Usuários', icon: Users, color: '#0f766e' },
  profile: { title: 'Meu cadastro', navLabel: 'Meu cadastro', icon: FileText, color: '#7c3aed' },
  patients: { title: 'Pacientes', navLabel: 'Pacientes - Cirurgias', icon: ClipboardList, color: '#2563eb' },
  billing: { title: 'Faturamento médico', navLabel: 'Faturamento', icon: ReceiptText, color: '#b45309' },
  billingHistory: { title: 'Histórico', navLabel: 'Histórico', icon: CalendarClock, color: '#0f766e' },
  reports: { title: 'Relatórios', navLabel: 'Relatórios', icon: BarChart3, color: '#1d4ed8' },
  tutorials: { title: 'Tutoriais interativos', navLabel: 'Tutoriais interativos', icon: PlayCircle, color: '#7c3aed' },
  medicalGroups: { title: 'Grupos médicos', navLabel: 'Grupos médicos', icon: ShieldPlus, color: '#0f4c81' },
  agenda: { title: 'Agenda e notificações', navLabel: 'Agenda e notificações', icon: CalendarDays, color: '#8a5a14' },
  clinics: { title: 'Clínicas', navLabel: 'Clínicas', icon: Building2, color: 'var(--clinics-accent)' },
  settings: { title: 'Opções', navLabel: 'Opções', icon: Settings, color: '#475569' },
} as const;
