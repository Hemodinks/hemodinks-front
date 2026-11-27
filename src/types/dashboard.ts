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
  // Registro de cirurgia (API recente). Nulos para perfis sem faturamento; ausentes em APIs antigas.
  cirurgiasNaoConsolidadasCount?: number | null;
  cirurgiasAReceberCount?: number | null;
  valorAReceber?: number | null;
  faturamentoMensal?: DashboardMonthlyBilling[] | null;
};

export type DashboardMonthlyBilling = {
  ano: number;
  mes: number;
  cirurgias: number;
  faturado: number;
  recebido: number;
};

export type DashboardSurgicalBilling = {
  naoConsolidadas: number;
  aReceber: number;
  valorAReceber: number;
  mensal: DashboardMonthlyBilling[];
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
  allDayStartDate?: string | null;
  allDayEndDate?: string | null;
  dataLeitura?: string | null;
};
