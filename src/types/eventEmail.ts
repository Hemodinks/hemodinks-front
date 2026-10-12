export type EventEmailRecipient = {
  userId: number;
  nome: string;
  email: string;
  status: 'available' | 'pending' | 'sent' | 'failed';
};

export type EventEmailPreview = {
  recipients: EventEmailRecipient[];
  recipientCount: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  excludedCount: number;
  canSend: boolean;
};

export type EventEmailQueueResult = { queuedCount: number };
