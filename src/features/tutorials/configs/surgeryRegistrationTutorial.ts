import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const surgeryRegistrationTutorial = defineStaticAudioTutorial({
  id: 'surgery-registration', view: 'patients', title: 'Missão: registrar atendimento e cirurgia', description: 'Associe datas, procedimento e dados operacionais.',
  steps: [
    { id: 'new', target: '[data-tour="patients-new"]', title: 'Novo atendimento', objective: 'Clique para abrir o cadastro.', narration: 'O registro de um atendimento ou de uma cirurgia começa neste cadastro. Clique em Novo paciente para abrir uma ficha fictícia de demonstração.', action: 'click' },
    { id: 'form', target: '[data-tour="patients-form"]', title: 'Ficha completa', objective: 'Conheça as seções operacionais do formulário.', narration: 'A ficha reúne a data da solicitação e a data da consolidação, o tipo da cirurgia, a equipe responsável, o hospital, o convênio, os dados de faturamento e os arquivos permitidos. Quando a data da consolidação é preenchida, o status da cirurgia passa automaticamente para Consolidada.', action: 'continue' },
    { id: 'procedure', target: '[data-tour="patients-procedure"]', title: 'Procedimentos', objective: 'Localize a seleção de procedimento.', narration: 'Nesta seção, pesquise o procedimento e confira o código correspondente antes de adicioná-lo. Para esta demonstração, não informe nem salve qualquer dado clínico real.', action: 'continue' },
    { id: 'save', target: '[data-tour="patients-save"]', title: 'Revisão final', objective: 'Confira onde o atendimento seria cadastrado.', narration: 'Antes de cadastrar o atendimento, revise as datas, o tipo da cirurgia, a equipe, o hospital, o convênio e os procedimentos selecionados. A data da consolidação não pode ser anterior à data da solicitação. Neste tutorial, nenhuma informação será salva.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'atendimento-cirurgia');
