import type { TutorialConfig } from '../tutorialTypes';
export const teamIdentificationTutorial = {
  id: 'team-identification', view: 'clinics', title: 'Missão: configurar a equipe', description: 'Entenda a equipe inicial e os tipos de identificação.',
  steps: [
    { id: 'new', target: '[data-tour="clinics-new"]', title: 'Abra uma clínica', objective: 'Clique em Nova clínica para acessar a equipe inicial.', narration: 'Abra o cadastro de uma clínica fictícia para configurar a equipe inicial.', action: 'click' },
    { id: 'team', target: '[data-tour="clinics-team"]', title: 'Equipe inicial', objective: 'Conheça os dados coletivos e o modo de identificação.', narration: 'A equipe inicial pode receber acesso coletivo conforme as regras da clínica. Nunca reutilize credenciais reais em treinamento.', action: 'continue' },
    { id: 'mode', target: '[data-tour="clinics-identification-mode"]', title: 'Tipo de identificação', objective: 'Compare as opções disponíveis.', narration: 'Escolha o modo de identificação adequado para saber quem realizou cada operação compartilhada.', action: 'continue' },
    { id: 'finish', target: '[data-tour="clinics-save"]', title: 'Configuração revisada', objective: 'Revise a equipe antes de salvar.', narration: 'Revise nome, contato, credencial fictícia e tipo de identificação antes de salvar a clínica.', action: 'continue' },
  ],
} satisfies TutorialConfig;
