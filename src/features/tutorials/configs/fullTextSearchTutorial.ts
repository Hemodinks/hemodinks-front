import type { TutorialConfig } from '../tutorialTypes';
export const fullTextSearchTutorial = {
  id: 'full-text-search', view: 'patients', title: 'Missão: usar a pesquisa inteligente', description: 'Localize registros com pesquisa textual.',
  steps: [
    { id: 'overview', target: '[data-tour="patients-list"]', title: 'Base pesquisável', objective: 'Entenda o escopo da pesquisa.', narration: 'A pesquisa trabalha sobre os registros que o seu perfil pode visualizar.', action: 'continue' },
    { id: 'search', target: '[data-tour="patients-search"]', title: 'Pesquisa inteligente', objective: 'Clique no campo de pesquisa.', narration: 'Clique na busca e use termos fictícios como registro, hospital ou procedimento de demonstração.', action: 'click' },
    { id: 'results', target: '[data-tour="patients-list"]', title: 'Resultado filtrado', objective: 'Observe a atualização da lista.', narration: 'A lista é atualizada pelos termos informados. Refine a expressão quando houver resultados demais.', action: 'continue' },
  ],
} satisfies TutorialConfig;
