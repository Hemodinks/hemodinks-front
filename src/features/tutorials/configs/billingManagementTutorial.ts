import type { TutorialConfig } from '../tutorialTypes';
export const billingManagementTutorial = {
  id: 'billing-management', view: 'billing', title: 'Missão: gerir o faturamento', description: 'Consulte filtros, indicadores e registros financeiros.',
  steps: [
    { id: 'overview', target: '[data-tour="billing-overview"]', title: 'Central financeira', objective: 'Reconheça a visão de faturamento.', narration: 'Esta central consolida honorários, pagamentos, glosas e pendências dos registros autorizados.', action: 'continue' },
    { id: 'filters', target: '[data-tour="billing-filters"]', title: 'Filtros financeiros', objective: 'Conheça os critérios da consulta.', narration: 'Combine cirurgião, convênio, hospital, procedimento, status, regime e competência para refinar a análise.', action: 'continue' },
    { id: 'apply', target: '[data-tour="billing-apply"]', title: 'Consultar', objective: 'Clique para aplicar os filtros atuais.', narration: 'Clique em Consultar. A missão aguarda sua ação e mantém o comportamento normal da tela.', action: 'click' },
    { id: 'summary', target: '[data-tour="billing-summary"]', title: 'Indicadores', objective: 'Leia a consolidação financeira.', narration: 'Os cartões resumem faturado, líquido, glosas, cirurgias, pagamentos e pendências.', action: 'continue' },
    { id: 'results', target: '[data-tour="billing-results"]', title: 'Registros detalhados', objective: 'Confira a grade da consulta.', narration: 'Use a grade para conferir cada registro e abrir os detalhes permitidos ao seu perfil.', action: 'continue' },
  ],
} satisfies TutorialConfig;
