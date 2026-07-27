import { DataPanel } from '../../shared/components/ui';

export function BillingDetailSummary({ title, value }: { title: string; value: string }) {
  return <DataPanel><span>{title}</span><h3>{value}</h3></DataPanel>;
}

