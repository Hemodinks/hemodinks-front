import { useEffect, useState } from 'react';
import type { BillingRecord } from './billingTypes';

// Store selection only. Resolve records from the currently authorized, filtered list.
export function useBillingChecklistDialog(records: BillingRecord[], scopeKey: string) {
  const [selection, setSelection] = useState<{ scopeKey: string; id: number | null } | null>(null);
  useEffect(() => {
    if (selection && (selection.scopeKey !== scopeKey || (selection.id !== null && !records.some((record) => record.id === selection.id)))) {
      setSelection(null);
    }
  }, [records, scopeKey, selection]);
  const selectedRecords = selection?.scopeKey === scopeKey
    ? selection.id === null ? records : records.filter((record) => record.id === selection.id)
    : [];
  return {
    records: selectedRecords,
    individual: selection?.id != null,
    open: (id: number | null = null) => setSelection({ scopeKey, id }),
    close: () => setSelection(null),
    isOpen: selection?.scopeKey === scopeKey && (selection.id === null || selectedRecords.length > 0),
  };
}
