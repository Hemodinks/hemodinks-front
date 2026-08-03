import { formatCurrency } from '../../shared/utils/formatters';
import type { BillingChecklistItem, BillingRecord } from './billingModels';

export function buildBillingChecklist(
  record: Omit<BillingRecord, 'billingChecklist' | 'pendingChecklistItems'>,
) {
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
    record.anesthesiologistBilledSeparately ||
    record.anesthesiologistFeesAmount != null ||
    record.anesthesiologistName
      ? {
          label: 'Anestesista faturado separado',
          value: [
            record.anesthesiologistName,
            record.anesthesiologistFeesAmount != null
              ? formatCurrency(record.anesthesiologistFeesAmount)
              : '',
            record.anesthesiologistBilledSeparately ? 'Faturado separado' : '',
          ]
            .filter(Boolean)
            .join(' | '),
          status:
            record.anesthesiologistFeesAmount != null || record.anesthesiologistBilledSeparately
              ? 'ok'
              : 'warning',
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
          value: [formatCurrency(record.netAmount), record.repasseMedicoObservacao]
            .filter(Boolean)
            .join(' | '),
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
