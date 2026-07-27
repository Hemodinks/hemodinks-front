export type DashboardSummary = {
  usersCount: number;
  activeUsersCount: number;
  pacientesCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  upcomingEventsCount: number;
  unreadObservationCount?: number;
  unreadAgendaNotificationCount?: number;
};

export type DashboardNotification = {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  pacienteId: number;
  eventId?: number | null;
  observacaoId?: number | null;
  nomePaciente: string;
  medico?: string | null;
  procedimento?: string | null;
  autor?: string | null;
  data?: string | null;
  dataLeitura?: string | null;
};
