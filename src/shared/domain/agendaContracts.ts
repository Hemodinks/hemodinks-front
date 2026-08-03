export type AgendaEvent = {
  id: number;
  userId: number;
  userName: string;
  medicalUserId?: number | null;
  medicalUserName?: string | null;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  notifyMedicalProfile: boolean;
  notifyUser: boolean;
  reminderPeriodMinutes?: number | null;
  lastReminderSentAt?: string | null;
  nextReminderAt?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type AgendaEventPayload = {
  userId?: number | null;
  medicalUserId?: number | null;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  notifyMedicalProfile: boolean;
  notifyUser: boolean;
  reminderPeriodMinutes?: number | null;
  isCompleted?: boolean | null;
  notificationMessage?: string | null;
  notifyAllAllowedRecipients?: boolean;
  notificationUserIds?: number[];
  notificationGroupIds?: number[];
};

export type AgendaMedicalUser = {
  id: number;
  nome: string;
};

export type AgendaNotificationRecipientUser = {
  id: number;
  nome: string;
  email: string;
  perfilId: number;
  perfilNome: string;
};

export type AgendaNotificationRecipientGroup = {
  id: number;
  nome: string;
  membrosCount: number;
};

export type AgendaNotificationRecipientOptions = {
  canNotifyAllAllowedRecipients: boolean;
  allRecipientsLabel: string;
  users: AgendaNotificationRecipientUser[];
  groups: AgendaNotificationRecipientGroup[];
};

export type PublicHoliday = {
  date: string;
  localName: string;
  name: string;
  global: boolean;
  types: string[];
};
