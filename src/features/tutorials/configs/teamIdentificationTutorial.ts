import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const teamIdentificationTutorial = defineStaticAudioTutorial({
  id: 'team-identification', view: 'clinics', title: 'Missão: configurar a equipe', description: 'Entenda a equipe inicial e os tipos de identificação.',
  steps: [
    { id: 'new', target: '[data-tour="clinics-new"]', title: 'Abra uma clínica', objective: 'Clique em Nova clínica para acessar a equipe inicial.', narration: 'Clique em Nova clínica para abrir o formulário. A configuração da equipe inicial faz parte do cadastro da clínica.', action: 'click' },
    { id: 'team', target: '[data-tour="clinics-team"]', title: 'Equipe inicial', objective: 'Conheça os dados coletivos e o modo de identificação.', narration: 'Nesta área, você define os dados da equipe que iniciará o uso do sistema. Se a clínica permitir acesso compartilhado, utilize uma credencial específica para essa finalidade. Nunca reutilize uma senha pessoal.', action: 'continue' },
    { id: 'mode', target: '[data-tour="clinics-identification-mode"]', title: 'Tipo de identificação', objective: 'Compare as opções disponíveis.', narration: 'O tipo de identificação determina como cada integrante informa quem está utilizando o acesso compartilhado. Escolha a opção que permita reconhecer com clareza o responsável por cada operação.', action: 'continue' },
    { id: 'finish', target: '[data-tour="clinics-save"]', title: 'Configuração revisada', objective: 'Revise a equipe antes de salvar.', narration: 'Para concluir, revise o nome da equipe, o contato, a credencial fictícia e o tipo de identificação. Neste tutorial, não é necessário salvar o cadastro.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'equipe-identificacao');
