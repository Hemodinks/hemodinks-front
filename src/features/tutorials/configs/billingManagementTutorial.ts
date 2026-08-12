import type { TutorialConfig } from '../tutorialTypes';
export const billingManagementTutorial = {
  id: 'billing-management', view: 'billing', title: 'Missão: gerir o faturamento', description: 'Consulte filtros, indicadores e registros financeiros.',
  steps: [
    { id: 'overview', target: '[data-tour="billing-overview"]', title: 'Central financeira', objective: 'Reconheça a visão de faturamento.', narration: 'Esta é a central de faturamento. Ela reúne os honorários, os pagamentos recebidos, as glosas e as pendências dos registros que o seu perfil pode consultar.', action: 'continue' },
    { id: 'filters', target: '[data-tour="billing-filters"]', title: 'Filtros financeiros', objective: 'Conheça os critérios da consulta.', narration: 'Use os filtros para encontrar exatamente o que precisa. Você pode combinar cirurgião, convênio, hospital, procedimento, situação do pagamento, regime e período de competência.', action: 'continue' },
    { id: 'apply', target: '[data-tour="billing-apply"]', title: 'Consultar', objective: 'Clique para aplicar os filtros atuais.', narration: 'Depois de escolher os critérios, clique em Consultar. O sistema aplicará os filtros, e o tutorial avançará somente após essa ação.', action: 'click' },
    { id: 'summary', target: '[data-tour="billing-summary"]', title: 'Indicadores', objective: 'Leia a consolidação financeira.', narration: 'Estes cartões apresentam um resumo da consulta: valor faturado, valor líquido, glosas, cirurgias, pagamentos e pendências. Use-os para obter uma visão rápida do período.', action: 'continue' },
    { id: 'results', target: '[data-tour="billing-results"]', title: 'Registros detalhados', objective: 'Confira a grade da consulta.', narration: 'Logo abaixo, a lista detalha os registros encontrados. Confira cada linha e abra somente as informações permitidas para o seu perfil.', action: 'continue' },
  ],
} satisfies TutorialConfig;
