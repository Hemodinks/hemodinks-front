import type { DashboardSummary, DashboardSurgicalBilling } from '../../types';

// Indicadores do registro de cirurgia. Nulo quando a API não os envia (perfil sem faturamento ou API antiga):
// nesse caso o painel mantém o indicador anterior de pendências financeiras.
export function toSurgicalBilling(summary: DashboardSummary | null | undefined): DashboardSurgicalBilling | null {
  if (summary?.cirurgiasAReceberCount == null || summary.cirurgiasNaoConsolidadasCount == null) return null;
  return {
    naoConsolidadas: summary.cirurgiasNaoConsolidadasCount,
    aReceber: summary.cirurgiasAReceberCount,
    valorAReceber: summary.valorAReceber ?? 0,
    mensal: summary.faturamentoMensal ?? [],
  };
}
