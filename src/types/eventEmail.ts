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
  creatorCopy?: {
    recipient: EventEmailRecipient | null;
    canSend: boolean;
    unavailableReason: string | null;
  } | null;
};

export type EventEmailQueueResult = { queuedCount: number };
