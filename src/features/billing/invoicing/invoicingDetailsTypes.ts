export type InvoicingConfirmAction = {
  title: string;
  message: string;
  action: () => Promise<unknown>;
  success: string;
  after?: () => void;
} | null;
