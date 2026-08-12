import type { TutorialConfig } from '../tutorialTypes';
export const agendaNotificationsTutorial = {
  id: 'agenda-notifications', view: 'agenda', title: 'Missão: organizar agenda e avisos', description: 'Cadastre um evento e configure notificações.',
  steps: [
    { id: 'overview', target: '[data-tour="agenda-overview"]', title: 'Agenda da clínica', objective: 'Conheça calendário, eventos e avisos.', narration: 'A agenda organiza eventos, lembretes e notificações de acordo com o perfil autenticado.', action: 'continue' },
    { id: 'new', target: '[data-tour="agenda-new"]', title: 'Novo evento', objective: 'Clique para abrir o formulário.', narration: 'Clique em Novo evento para preparar um compromisso fictício.', action: 'click' },
    { id: 'details', target: '[data-tour="agenda-details"]', title: 'Data e detalhes', objective: 'Conheça os campos principais.', narration: 'Informe título, datas e horários usando somente conteúdo de demonstração.', action: 'continue' },
    { id: 'notifications', target: '[data-tour="agenda-notifications"]', title: 'Destinatários e mensagem', objective: 'Configure os avisos permitidos.', narration: 'Defina uma mensagem fictícia e selecione somente destinatários de homologação.', action: 'continue' },
    { id: 'save', target: '[data-tour="agenda-save"]', title: 'Revisão do evento', objective: 'Localize o cadastro final.', narration: 'Revise o evento e seus destinatários antes de cadastrar.', action: 'continue' },
  ],
} satisfies TutorialConfig;
