import type { BillingBreakdownItem, BillingRecord, BillingSummary } from './billingModels';

export function summarizeBillingRecords(records: BillingRecord[]): BillingSummary {
  return records.reduce<BillingSummary>(
    (summary, record) => ({
      totalRecords: summary.totalRecords + 1,
      totalGrossAmount: summary.totalGrossAmount + record.paymentAmount,
      totalGlosaAmount: summary.totalGlosaAmount + record.glosaAmount,
      totalNetAmount: summary.totalNetAmount + record.netAmount,
      paidCount: summary.paidCount + (record.status === 'paid' ? 1 : 0),
      pendingCount: summary.pendingCount + (record.status === 'pending' ? 1 : 0),
      missingAmountCount: summary.missingAmountCount + (record.status === 'missing' ? 1 : 0),
      particularCount: summary.particularCount + (record.regime === 'particular' ? 1 : 0),
      convenioCount: summary.convenioCount + (record.regime === 'convenio' ? 1 : 0),
      authorizationCount: summary.authorizationCount + (record.authorizationCode ? 1 : 0),
      opmeCount: summary.opmeCount + (record.hasOpme ? 1 : 0),
      attachmentCount: summary.attachmentCount + (record.filesCount > 0 ? 1 : 0),
      glosaCasesCount: summary.glosaCasesCount + (record.glosaAmount > 0 ? 1 : 0),
      recordsWithPendingItems:
        summary.recordsWithPendingItems + (record.pendingChecklistItems > 0 ? 1 : 0),
      nonNumericPaymentCount:
        summary.nonNumericPaymentCount +
        (!record.paymentHasNumericValue && record.paymentRaw ? 1 : 0),
      nonNumericGlosaCount:
        summary.nonNumericGlosaCount + (!record.glosaHasNumericValue && record.glosaRaw ? 1 : 0),
    }),
    {
      totalRecords: 0,
      totalGrossAmount: 0,
      totalGlosaAmount: 0,
      totalNetAmount: 0,
      paidCount: 0,
      pendingCount: 0,
      missingAmountCount: 0,
      particularCount: 0,
      convenioCount: 0,
      authorizationCount: 0,
      opmeCount: 0,
      attachmentCount: 0,
      glosaCasesCount: 0,
      recordsWithPendingItems: 0,
      nonNumericPaymentCount: 0,
      nonNumericGlosaCount: 0,
    },
  );
}

function buildBreakdown(records: BillingRecord[], getLabel: (record: BillingRecord) => string) {
  const bucket = new Map<string, BillingBreakdownItem>();

  records.forEach((record) => {
    const label = getLabel(record);
    const current = bucket.get(label);

    if (current) {
      current.totalGrossAmount += record.paymentAmount;
      current.totalNetAmount += record.netAmount;
      current.totalGlosaAmount += record.glosaAmount;
      current.totalRecords += 1;
      current.pendingCount += record.pendingChecklistItems > 0 ? 1 : 0;
      return;
    }

    bucket.set(label, {
      label,
      totalGrossAmount: record.paymentAmount,
      totalNetAmount: record.netAmount,
      totalGlosaAmount: record.glosaAmount,
      totalRecords: 1,
      pendingCount: record.pendingChecklistItems > 0 ? 1 : 0,
    });
  });

  return [...bucket.values()].sort((left, right) => {
    if (right.totalGrossAmount !== left.totalGrossAmount) {
      return right.totalGrossAmount - left.totalGrossAmount;
    }

    return left.label.localeCompare(right.label, 'pt-BR');
  });
}

export function groupBillingByDoctor(records: BillingRecord[]) {
  return buildBreakdown(records, (record) => record.doctorName || 'Sem cirurgião');
}

export function groupBillingByConvenio(records: BillingRecord[]) {
  return buildBreakdown(records, (record) =>
    record.regime === 'particular' ? 'Particular' : record.convenioName || 'Convênio não informado',
  );
}
