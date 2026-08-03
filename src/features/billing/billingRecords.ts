import type { Paciente } from '../../shared/domain/clinicalContracts';
import {
  getPacienteProcedimentosFromPaciente,
  normalizeCbhpmCodigo,
} from '../../shared/domain/cbhpm';
import {
  formatCurrency,
  formatPersonName,
  normalizeDisplayText,
  toDisplayDate,
} from '../../shared/utils/formatters';
import type { BillingRecord, BillingRecordStatus } from './billingModels';
import { buildBillingChecklist } from './billingChecklist';

function parseCurrencyLikeValue(value?: string | null) {
  const raw = value?.trim() ?? '';

  if (!raw) {
    return { amount: 0, hasNumericValue: false };
  }

  const normalized = raw
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return { amount: 0, hasNumericValue: false };
  }

  const amount = Number(normalized);

  return Number.isFinite(amount)
    ? { amount, hasNumericValue: true }
    : { amount: 0, hasNumericValue: false };
}

function getBillingStatus(
  paciente: Paciente,
  hasPaymentValue: boolean,
  hasGlosaValue: boolean,
): BillingRecordStatus {
  if (paciente.statusPago) {
    return 'paid';
  }

  if (
    hasPaymentValue ||
    hasGlosaValue ||
    Boolean(paciente.pagamento?.trim()) ||
    Boolean(paciente.repasseGlosa?.trim())
  ) {
    return 'pending';
  }

  return 'missing';
}

function getBillingStatusLabel(status: BillingRecordStatus) {
  if (status === 'paid') {
    return 'Pago';
  }

  if (status === 'pending') {
    return 'Pendente';
  }

  return 'Sem valor';
}

export function buildBillingRecords(pacientes: Paciente[]) {
  return pacientes.map((paciente) => {
    const faturamento = paciente.faturamento ?? null;
    const procedures = getPacienteProcedimentosFromPaciente(paciente);
    const paymentInfo =
      faturamento?.honorariosCirurgiao != null
        ? { amount: faturamento.honorariosCirurgiao, hasNumericValue: true }
        : parseCurrencyLikeValue(paciente.pagamento);
    const glosaInfo =
      faturamento?.valorGlosa != null
        ? { amount: faturamento.valorGlosa, hasNumericValue: true }
        : parseCurrencyLikeValue(paciente.repasseGlosa);
    const doctorName = formatPersonName(paciente.medico) || 'Não informado';
    const assistantNames = [paciente.medicoAuxiliar1, paciente.medicoAuxiliar2]
      .map((value) => formatPersonName(value))
      .filter(Boolean);
    const procedureCodes = procedures
      .map((item) => normalizeCbhpmCodigo(item.cbhpmCodigo))
      .filter(Boolean);
    const primaryProcedure = procedures[0];
    const primaryProcedureLabel = primaryProcedure
      ? `${primaryProcedure.cbhpmCodigo ? `${primaryProcedure.cbhpmCodigo} - ` : ''}${primaryProcedure.procedimento}`
      : '';
    const status = getBillingStatus(
      paciente,
      paymentInfo.hasNumericValue,
      glosaInfo.hasNumericValue,
    );
    const billingCadastroDate = faturamento?.dataCadastro ?? paciente.dataCadastro ?? null;
    const convenioName = normalizeDisplayText(paciente.convenio);
    const baseRecord: Omit<BillingRecord, 'billingChecklist' | 'pendingChecklistItems'> = {
      id: paciente.id,
      paciente,
      patientName: formatPersonName(paciente.nomePaciente),
      doctorName,
      doctorUserId: paciente.medicoUserId ?? null,
      assistantNames,
      hospitalName: paciente.hospital?.trim() || 'Não informado',
      convenioName: convenioName || 'Particular',
      regime: convenioName ? 'convenio' : 'particular',
      surgeryDate: paciente.data ?? null,
      surgeryDateLabel: paciente.data ? toDisplayDate(paciente.data) : '-',
      competenciaInicio:
        billingCadastroDate ?? faturamento?.competenciaInicio ?? paciente.data ?? null,
      competenciaFinal:
        billingCadastroDate ??
        faturamento?.competenciaFinal ??
        faturamento?.competenciaInicio ??
        paciente.data ??
        null,
      authorizationCode:
        faturamento?.guiaAutorizacaoConvenio?.trim() || paciente.autorizacao?.trim() || '',
      paymentRaw:
        faturamento?.honorariosCirurgiao != null
          ? formatCurrency(faturamento.honorariosCirurgiao)
          : paciente.pagamento?.trim() || '',
      paymentAmount: paymentInfo.amount,
      paymentHasNumericValue: paymentInfo.hasNumericValue,
      glosaRaw:
        faturamento?.valorGlosa != null
          ? formatCurrency(faturamento.valorGlosa)
          : paciente.repasseGlosa?.trim() || '',
      glosaAmount: glosaInfo.amount,
      glosaHasNumericValue: glosaInfo.hasNumericValue,
      assistantFeesAmount: faturamento?.honorariosAuxiliares ?? null,
      anesthesiologistFeesAmount: faturamento?.honorariosAnestesista ?? null,
      anesthesiologistName: faturamento?.anestesista?.trim() || '',
      anesthesiologistBilledSeparately: faturamento?.anestesistaFaturadoSeparado ?? false,
      guiaInternacaoOuSadt: faturamento?.guiaInternacaoOuSadt?.trim() || '',
      tissXmlStatus: faturamento?.tissXmlStatus?.trim() || '',
      glosaStatus: faturamento?.glosaStatus?.trim() || '',
      recursoGlosa: faturamento?.recursoGlosa?.trim() || '',
      repasseMedicoObservacao: faturamento?.repasseMedicoObservacao?.trim() || '',
      tipoFaturamentoParticular: faturamento?.tipoFaturamentoParticular?.trim() || '',
      reciboNotaContrato: faturamento?.reciboNotaContrato?.trim() || '',
      netAmount: faturamento?.repasseMedico ?? paymentInfo.amount - glosaInfo.amount,
      status,
      statusLabel: getBillingStatusLabel(status),
      filesCount: paciente.arquivosCount ?? paciente.arquivos.length,
      hasOpme: Boolean(
        faturamento?.opmeMateriaisEspeciais?.trim() || paciente.opmeFornecedor?.trim(),
      ),
      opmeSupplier:
        faturamento?.opmeMateriaisEspeciais?.trim() ||
        paciente.opmeFornecedor?.trim() ||
        'Não informado',
      procedureSummary: procedures.length
        ? procedures.map((item) => item.procedimento).join(', ')
        : 'Não informado',
      procedureCodes: faturamento?.codigoTussCbhpmAmb
        ? faturamento.codigoTussCbhpmAmb
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : procedureCodes,
      primaryProcedureLabel,
      procedures,
      surgicalPortes: faturamento?.porteCirurgicoAnestesico
        ? faturamento.porteCirurgicoAnestesico
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : procedures.map((item) => item.cbhpmPorte?.trim() || '').filter(Boolean),
    };
    const checklist = buildBillingChecklist(baseRecord);

    return {
      ...baseRecord,
      billingChecklist: checklist.checklist,
      pendingChecklistItems: checklist.pendingChecklistItems,
    };
  });
}
