import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { AtendimentoCirurgico, Faturamento } from './billingDomainTypes';
import type { FaturamentoFormState } from './billingPageTypes';

export type InvoicingSectionProps = {
  canManage: boolean;
  editingId: number | null;
  showForm: boolean;
  loading: boolean;
  form: FaturamentoFormState;
  atendimentos: AtendimentoCirurgico[];
  faturamentos: Faturamento[];
  setForm: Dispatch<SetStateAction<FaturamentoFormState>>;
  onToggleForm: () => void;
  onSubmit: (event: FormEvent) => void;
  onCancelEditing: () => void;
  onSelect: (item: Faturamento) => void;
  onEdit: (item: Faturamento) => void;
  onDelete: (item: Faturamento) => void;
  onPrepare: (item: Faturamento) => void;
  onSend: (item: Faturamento) => void;
  onOpenReturn: (item: Faturamento) => void;
  onCreateAccount: (item: Faturamento) => void;
  onOpenAppeal: (glosaId: number, valorGlosado: number) => void;
};
