import type { Dispatch, SetStateAction } from 'react';

export type BillingTab = 'atendimentos' | 'faturamento' | 'financeiro' | 'precos';

export type BillingFeedback = {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export type RunBillingAction = (
  action: () => Promise<unknown>,
  message: string,
  feedback?: BillingFeedback,
) => Promise<boolean>;

export type ConfirmAction = {
  title: string;
  message: string;
  action: () => Promise<unknown>;
  success: string;
  after?: () => void;
} | null;

export type SetConfirmAction = Dispatch<SetStateAction<ConfirmAction>>;
