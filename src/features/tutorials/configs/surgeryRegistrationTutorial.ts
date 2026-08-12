import type { TutorialConfig } from '../tutorialTypes';
export const surgeryRegistrationTutorial = {
  id: 'surgery-registration', view: 'patients', title: 'Missão: registrar atendimento e cirurgia', description: 'Associe datas, procedimento e dados operacionais.',
  steps: [
    { id: 'new', target: '[data-tour="patients-new"]', title: 'Novo atendimento', objective: 'Clique para abrir o cadastro.', narration: 'Cada atendimento ou cirurgia parte do cadastro de paciente. Clique para abrir um registro fictício.', action: 'click' },
    { id: 'form', target: '[data-tour="patients-form"]', title: 'Ficha completa', objective: 'Conheça as seções operacionais do formulário.', narration: 'A ficha reúne solicitação, atendimento, equipe, hospital, convênio, faturamento e arquivos.', action: 'continue' },
    { id: 'procedure', target: '[data-tour="patients-procedure"]', title: 'Procedimentos', objective: 'Localize a seleção de procedimento.', narration: 'Use a pesquisa de procedimentos para associar o código correto. Nesta missão, não salve informação clínica real.', action: 'continue' },
    { id: 'save', target: '[data-tour="patients-save"]', title: 'Revisão final', objective: 'Confira onde o atendimento seria cadastrado.', narration: 'Revise datas, equipe e procedimento antes de cadastrar o atendimento.', action: 'continue' },
  ],
} satisfies TutorialConfig;
