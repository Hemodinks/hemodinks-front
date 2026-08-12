import type { TutorialConfig } from '../tutorialTypes';
export const fullTextSearchTutorial = {
  id: 'full-text-search', view: 'patients', title: 'Missão: usar a pesquisa inteligente', description: 'Localize registros com pesquisa textual.',
  steps: [
    { id: 'overview', target: '[data-tour="patients-list"]', title: 'Base pesquisável', objective: 'Entenda o escopo da pesquisa.', narration: 'A pesquisa considera apenas os registros que o seu perfil tem permissão para visualizar. Ela ajuda a localizar rapidamente uma informação dentro da lista.', action: 'continue' },
    { id: 'search', target: '[data-tour="patients-search"]', title: 'Pesquisa inteligente', objective: 'Clique no campo de pesquisa.', narration: 'Clique no campo de pesquisa. Você pode procurar por diferentes informações visíveis na lista. Neste treinamento, use termos fictícios, como hospital de demonstração ou procedimento de teste.', action: 'click' },
    { id: 'results', target: '[data-tour="patients-list"]', title: 'Resultado filtrado', objective: 'Observe a atualização da lista.', narration: 'A lista será atualizada de acordo com o texto digitado. Se aparecerem muitos resultados, acrescente mais detalhes à pesquisa. Para voltar à lista completa, limpe o campo.', action: 'continue' },
  ],
} satisfies TutorialConfig;
