import { createPatientFormPdf } from '../../patients/export/patientFormExporter';
import { getPacienteFormData } from '../../patients/patientUtils';
import { resolveReportIdentity } from '../../../shared/export/reportIdentity';
import { getPacienteObservacoes } from '../../../services';
import type { PacienteObservacao } from '../../../types';
import type { ReportRecord } from '../reportTypes';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'paciente';
}

export function getIndividualBillingPdfFileName(record: ReportRecord) {
  return `ficha-paciente-${slugify(record.patientName)}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export async function exportIndividualBillingPdf(
  record: ReportRecord,
  companyName: string,
  sessionToken: string,
) {
  const formData = {
    ...getPacienteFormData(record.paciente),
    pagamento: record.paymentRaw,
    repasseGlosa: record.glosaRaw,
  };
  const identity = await resolveReportIdentity({
    clinicName: companyName,
    title: 'Ficha do paciente - Faturamento médico',
    sessionToken,
    contextLines: [record.patientName, `${record.surgeryDateLabel} • ${record.statusLabel}`],
  });
  let observations: PacienteObservacao[] = [];
  try {
    observations = await getPacienteObservacoes(record.paciente.id, sessionToken);
  } catch {
    // A indisponibilidade das conversas não deve impedir a exportação da ficha.
  }
  const document = await createPatientFormPdf(formData, identity, observations);
  document.save(getIndividualBillingPdfFileName(record));
}
