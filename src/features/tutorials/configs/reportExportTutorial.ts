import type { TutorialConfig } from '../tutorialTypes';
export const reportExportTutorial = {
  id: 'report-export', view: 'reports', title: 'Missão: exportar relatórios', description: 'Prepare uma consulta e gere PDF ou planilha.',
  steps: [
    { id: 'filters', target: '[data-tour="reports-filters"]', title: 'Prepare a exportação', objective: 'Defina filtros antes de gerar o arquivo.', narration: 'A exportação respeita exatamente os filtros e as permissões da consulta atual.', action: 'continue' },
    { id: 'apply', target: '[data-tour="reports-apply"]', title: 'Atualize o resultado', objective: 'Clique em Consultar.', narration: 'Clique em Consultar para atualizar o conjunto de dados que será exportado.', action: 'click' },
    { id: 'results', target: '[data-tour="reports-results"]', title: 'Confira os dados', objective: 'Revise o resultado antes de exportar.', narration: 'Confira a lista detalhada e confirme que o conteúdo está adequado ao objetivo da análise.', action: 'continue' },
    { id: 'export', target: '[data-tour="reports-export"]', title: 'Escolha o formato', objective: 'Localize as opções PDF e Planilha.', narration: 'Use PDF para leitura e planilha para análise estruturada. Os arquivos seguem o escopo autorizado.', action: 'continue' },
  ],
} satisfies TutorialConfig;
