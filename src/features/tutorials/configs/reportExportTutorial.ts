import type { TutorialConfig } from '../tutorialTypes';
export const reportExportTutorial = {
  id: 'report-export', view: 'reports', title: 'Missão: exportar relatórios', description: 'Prepare uma consulta e gere PDF ou planilha.',
  steps: [
    { id: 'filters', target: '[data-tour="reports-filters"]', title: 'Prepare a exportação', objective: 'Defina filtros antes de gerar o arquivo.', narration: 'Antes de exportar, defina os filtros da consulta. O arquivo conterá exatamente os registros encontrados e respeitará as permissões do seu perfil.', action: 'continue' },
    { id: 'apply', target: '[data-tour="reports-apply"]', title: 'Atualize o resultado', objective: 'Clique em Consultar.', narration: 'Agora, clique em Consultar. Assim, a lista será atualizada com os dados que farão parte da exportação.', action: 'click' },
    { id: 'results', target: '[data-tour="reports-results"]', title: 'Confira os dados', objective: 'Revise o resultado antes de exportar.', narration: 'Antes de gerar o arquivo, confira a lista detalhada. Verifique se o período, os filtros e os resultados correspondem ao objetivo da análise.', action: 'continue' },
    { id: 'export', target: '[data-tour="reports-export"]', title: 'Escolha o formato', objective: 'Localize as opções PDF e Planilha.', narration: 'Escolha o formato mais adequado. Use Pê Dê Éfe para leitura e compartilhamento controlado. Use a planilha quando precisar organizar ou analisar os dados em colunas.', action: 'continue' },
  ],
} satisfies TutorialConfig;
