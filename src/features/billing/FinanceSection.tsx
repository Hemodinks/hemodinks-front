import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import type { ContaReceber, FinanceiroResumo } from './billingDomainTypes';
import type { Convenio, MedicalUserOption, Paciente } from '../../shared/domain/clinicalContracts';
import type {
  FinanceFiltersState,
  FinancePageState,
  ReceiptFormState,
  ReceiptToastState,
} from './billingPageTypes';
import { FinanceAccountsTable, FinanceSummaryCards } from './FinanceSectionParts';
import { FinanceFiltersPanel } from './FinanceFiltersPanel';
import { FinanceReceiptPanel } from './FinanceReceiptPanel';

type FinanceSectionProps = {
  resumo: FinanceiroResumo | null;
  received: number;
  openBalance: number;
  filters: FinanceFiltersState;
  receipt: ReceiptFormState;
  receiptToast: ReceiptToastState | null;
  contas: ContaReceber[];
  convenios: Convenio[];
  medicalUsers: MedicalUserOption[];
  pacientes: Paciente[];
  page: FinancePageState;
  loading: boolean;
  setFilters: Dispatch<SetStateAction<FinanceFiltersState>>;
  setReceipt: Dispatch<SetStateAction<ReceiptFormState>>;
  onApplyFilters: (page: number) => void;
  onSubmitReceipt: (event: FormEvent) => void;
  onReceiptFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectAccount: (account: ContaReceber) => void;
  onOpenReversal: (id: number, valor: number) => void;
};

export function FinanceSection(props: FinanceSectionProps) {
  return (
    <>
      <FinanceSummaryCards
        resumo={props.resumo}
        received={props.received}
        openBalance={props.openBalance}
      />
      <FinanceFiltersPanel
        filters={props.filters}
        convenios={props.convenios}
        medicalUsers={props.medicalUsers}
        pacientes={props.pacientes}
        loading={props.loading}
        setFilters={props.setFilters}
        onApplyFilters={props.onApplyFilters}
      />
      <FinanceReceiptPanel
        receipt={props.receipt}
        receiptToast={props.receiptToast}
        contas={props.contas}
        loading={props.loading}
        setReceipt={props.setReceipt}
        onSubmitReceipt={props.onSubmitReceipt}
        onReceiptFileChange={props.onReceiptFileChange}
      />
      <FinanceAccountsTable
        contas={props.contas}
        page={props.page}
        onApplyFilters={props.onApplyFilters}
        onSelectAccount={props.onSelectAccount}
        onOpenReversal={props.onOpenReversal}
      />
    </>
  );
}
