import type { Paciente } from '../../types';
import { getPacienteProcedimentosFromPaciente, normalizeCbhpmCodigo } from '../patients/patientUtils';
import {
  formatCurrency,
  formatPersonName,
  normalizeDisplayText,
  toDisplayDate,
} from '../../shared/utils/formatters';
import type {
  BillingChecklistItem,
  BillingFilters,
  BillingRecord,
  BillingRecordStatus,
} from './billingTypes';

export type * from './billingTypes';
export {
  filterBillingRecords,
  groupBillingByConvenio,
  groupBillingByDoctor,
  summarizeBillingRecords,
} from './billingAnalytics';

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
function getBillingStatus(paciente: Paciente, hasPaymentValue: boolean, hasGlosaValue: boolean): BillingRecordStatus {
  if (paciente.statusPago) {
    return 'paid';
  }

  if (hasPaymentValue || hasGlosaValue || Boolean(paciente.pagamento?.trim()) || Boolean(paciente.repasseGlosa?.trim())) {
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

function buildBillingChecklist(record: Omit<BillingRecord, 'billingChecklist' | 'pendingChecklistItems'>) {
  const checklist: BillingChecklistItem[] = [
    record.paymentHasNumericValue
      ? {
          label: 'Honorários do cirurgião',
          value: formatCurrency(record.paymentAmount),
          status: 'ok',
        }
      : record.paymentRaw
        ? {
            label: 'Honorários do cirurgião',
            value: record.paymentRaw,
            status: 'warning',
            hint: 'Campo de pagamento preenchido sem valor monetário estruturado.',
          }
        : {
            label: 'Honorários do cirurgião',
            value: 'Não informado',
            status: 'missing',
          },
    record.assistantFeesAmount != null
      ? {
          label: 'Honorários de auxiliares cirúrgicos',
          value: formatCurrency(record.assistantFeesAmount),
          status: 'ok',
        }
      : record.assistantNames.length
      ? {
          label: 'Honorários de auxiliares cirúrgicos',
          value: record.assistantNames.join(', '),
          status: 'warning',
          hint: 'Equipe auxiliar cadastrada, mas sem valor separado por honorário.',
        }
      : {
          label: 'Honorários de auxiliares cirúrgicos',
          value: 'Não informado',
          status: 'missing',
        },
    record.anesthesiologistBilledSeparately || record.anesthesiologistFeesAmount != null || record.anesthesiologistName
      ? {
          label: 'Anestesista faturado separado',
          value: [
            record.anesthesiologistName,
            record.anesthesiologistFeesAmount != null ? formatCurrency(record.anesthesiologistFeesAmount) : '',
            record.anesthesiologistBilledSeparately ? 'Faturado separado' : '',
          ].filter(Boolean).join(' | '),
          status: record.anesthesiologistFeesAmount != null || record.anesthesiologistBilledSeparately ? 'ok' : 'warning',
        }
      : {
          label: 'Anestesista faturado separado',
          value: 'Não informado no cadastro',
          status: 'missing',
        },
    record.primaryProcedureLabel
      ? {
          label: 'Procedimento principal',
          value: record.primaryProcedureLabel,
          status: 'ok',
        }
      : {
          label: 'Procedimento principal',
          value: 'Não informado',
          status: 'missing',
        },
    record.procedures.length > 1
      ? {
          label: 'Procedimentos associados',
          value: `${record.procedures.length - 1} associado(s)`,
          status: 'ok',
        }
      : {
          label: 'Procedimentos associados',
          value: 'Somente procedimento principal',
          status: 'warning',
        },
    record.procedureCodes.length
      ? {
          label: 'Código TUSS/CBHPM/AMB',
          value: record.procedureCodes.join(', '),
          status: 'ok',
        }
      : {
          label: 'Código TUSS/CBHPM/AMB',
          value: 'Sem código informado',
          status: 'missing',
        },
    record.surgicalPortes.length
      ? {
          label: 'Porte cirúrgico/anestésico',
          value: record.surgicalPortes.join(', '),
          status: 'ok',
        }
      : {
          label: 'Porte cirúrgico/anestésico',
          value: 'Não informado',
          status: 'missing',
        },
    record.regime === 'particular'
      ? {
          label: 'Guia de autorização do convênio',
          value: 'Não se aplica ao faturamento particular',
          status: 'ok',
        }
      : record.authorizationCode
        ? {
            label: 'Guia de autorização do convênio',
            value: record.authorizationCode,
            status: 'ok',
          }
        : {
            label: 'Guia de autorização do convênio',
            value: 'Não informada',
            status: 'missing',
          },
    record.regime === 'particular'
      ? {
          label: 'Guia de internação ou SADT',
          value: 'Não se aplica ao faturamento particular',
          status: 'ok',
        }
      : record.guiaInternacaoOuSadt
        ? {
            label: 'Guia de internação ou SADT',
            value: record.guiaInternacaoOuSadt,
            status: 'ok',
          }
      : record.filesCount > 0
        ? {
            label: 'Guia de internação ou SADT',
            value: `${record.filesCount} anexo(s) disponível(is)`,
            status: 'warning',
            hint: 'Validar se a guia está entre os arquivos anexados.',
          }
        : {
            label: 'Guia de internação ou SADT',
            value: 'Sem guia anexada',
            status: 'missing',
          },
    record.hasOpme
      ? {
          label: 'OPME/materiais especiais',
          value: record.opmeSupplier,
          status: 'ok',
        }
      : {
          label: 'OPME/materiais especiais',
          value: 'Não informado',
          status: 'warning',
        },
    record.tissXmlStatus
      ? {
          label: 'Envio em padrão TISS/XML',
          value: record.tissXmlStatus,
          status: 'ok',
        }
      : record.filesCount > 0
      ? {
          label: 'Envio em padrão TISS/XML',
          value: `${record.filesCount} anexo(s) de suporte`,
          status: 'warning',
          hint: 'O cadastro não marca explicitamente o envio TISS/XML.',
        }
      : {
          label: 'Envio em padrão TISS/XML',
          value: 'Sem evidência no cadastro',
          status: 'missing',
        },
    record.glosaStatus || record.recursoGlosa
      ? {
          label: 'Glosas, recursos e conferência',
          value: [record.glosaStatus, record.recursoGlosa].filter(Boolean).join(' | '),
          status: record.glosaHasNumericValue && record.glosaAmount > 0 ? 'warning' : 'ok',
        }
      : record.glosaHasNumericValue && record.glosaAmount > 0
      ? {
          label: 'Glosas, recursos e conferência',
          value: formatCurrency(record.glosaAmount),
          status: 'warning',
        }
      : record.status === 'paid'
        ? {
            label: 'Glosas, recursos e conferência',
            value: 'Pagamento conferido',
            status: 'ok',
          }
        : {
            label: 'Glosas, recursos e conferência',
            value: 'Aguardando conferência',
            status: 'warning',
          },
    record.paymentHasNumericValue && record.hospitalName
      ? {
          label: 'Repasse médico via hospital/clínica',
          value: [formatCurrency(record.netAmount), record.repasseMedicoObservacao].filter(Boolean).join(' | '),
          status: 'warning',
          hint: 'Líquido estimado a partir de pagamento menos glosa.',
        }
      : {
          label: 'Repasse médico via hospital/clínica',
          value: 'Não separado no cadastro',
          status: 'missing',
        },
    record.regime === 'particular'
      ? record.reciboNotaContrato
        ? {
            label: 'Faturamento particular com suporte',
            value: record.reciboNotaContrato,
            status: 'ok',
          }
        : record.filesCount > 0
        ? {
            label: 'Faturamento particular com suporte',
            value: `${record.tipoFaturamentoParticular || 'Particular'} | ${record.filesCount} anexo(s) de suporte`,
            status: 'ok',
          }
        : {
            label: 'Faturamento particular com suporte',
            value: 'Sem recibo, nota ou contrato anexado',
            status: 'warning',
          }
      : {
          label: 'Faturamento particular com suporte',
          value: 'Realizado via convênio',
          status: 'ok',
        },
  ];

  return {
    checklist,
    pendingChecklistItems: checklist.filter((item) => item.status !== 'ok').length,
  };
}

export function createEmptyBillingFilters(defaultDoctor = '', defaultCompetencia = ''): BillingFilters {
  return {
    search: '',
    medico: defaultDoctor,
    convenio: '',
    hospital: '',
    procedimento: '',
    competenciaInicio: defaultCompetencia,
    competenciaFinal: defaultCompetencia,
    paymentStartDate: '',
    paymentEndDate: '',
    status: 'all',
    regime: 'all',
    onlyPendingItems: false,
  };
}

export function buildBillingRecords(pacientes: Paciente[]) {
  return pacientes.map((paciente) => {
    const faturamento = paciente.faturamento ?? null;
    const procedures = getPacienteProcedimentosFromPaciente(paciente);
    const paymentInfo = faturamento?.honorariosCirurgiao != null
      ? { amount: faturamento.honorariosCirurgiao, hasNumericValue: true }
      : parseCurrencyLikeValue(paciente.pagamento);
    const glosaInfo = faturamento?.valorGlosa != null
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
    const status = getBillingStatus(paciente, paymentInfo.hasNumericValue, glosaInfo.hasNumericValue);
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
      attendanceDate: paciente.dataAtendimento ?? null,
      surgeryDate: paciente.dataAtendimento ?? paciente.data ?? null,
      surgeryDateLabel: paciente.dataAtendimento
        ? toDisplayDate(paciente.dataAtendimento)
        : paciente.data ? toDisplayDate(paciente.data) : '-',
      paymentDate: faturamento?.dataPagamento ?? null,
      paymentDateLabel: toDisplayDate(faturamento?.dataPagamento) || '-',
      competenciaInicio: billingCadastroDate ?? faturamento?.competenciaInicio ?? paciente.data ?? null,
      competenciaFinal: billingCadastroDate ?? faturamento?.competenciaFinal ?? faturamento?.competenciaInicio ?? paciente.data ?? null,
      authorizationCode: faturamento?.guiaAutorizacaoConvenio?.trim() || paciente.autorizacao?.trim() || '',
      paymentRaw: faturamento?.honorariosCirurgiao != null ? formatCurrency(faturamento.honorariosCirurgiao) : paciente.pagamento?.trim() || '',
      paymentAmount: paymentInfo.amount,
      paymentHasNumericValue: paymentInfo.hasNumericValue,
      glosaRaw: faturamento?.valorGlosa != null ? formatCurrency(faturamento.valorGlosa) : paciente.repasseGlosa?.trim() || '',
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
      hasOpme: Boolean(faturamento?.opmeMateriaisEspeciais?.trim() || paciente.opmeFornecedor?.trim()),
      opmeSupplier: faturamento?.opmeMateriaisEspeciais?.trim() || paciente.opmeFornecedor?.trim() || 'Não informado',
      procedureSummary: procedures.length
        ? procedures.map((item) => item.procedimento).join(', ')
        : 'Não informado',
      procedureCodes: faturamento?.codigoTussCbhpmAmb
        ? faturamento.codigoTussCbhpmAmb.split(',').map((item) => item.trim()).filter(Boolean)
        : procedureCodes,
      primaryProcedureLabel,
      procedures,
      surgicalPortes: faturamento?.porteCirurgicoAnestesico
        ? faturamento.porteCirurgicoAnestesico.split(',').map((item) => item.trim()).filter(Boolean)
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
