import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const agendaNotificationsTutorial = defineStaticAudioTutorial({
  id: 'agenda-notifications', view: 'agenda', title: 'Missão: organizar agenda e avisos', description: 'Cadastre um evento e configure notificações.',
  steps: [
    { id: 'overview', target: '[data-tour="agenda-overview"]', title: 'Agenda da clínica', objective: 'Conheça calendário, eventos e avisos.', narration: 'Esta é a agenda da clínica. Aqui, você acompanha compromissos, lembretes e notificações disponíveis para o seu perfil.', action: 'continue' },
    { id: 'new', target: '[data-tour="agenda-new"]', title: 'Novo evento', objective: 'Clique para abrir o formulário.', narration: 'Para criar um compromisso, clique em Novo evento. O formulário será aberto com as opções de data, horário e notificação.', action: 'click' },
    { id: 'details', target: '[data-tour="agenda-details"]', title: 'Data e detalhes', objective: 'Conheça os campos principais.', narration: 'Informe um título claro e uma descrição objetiva. Depois, confira as datas e os horários de início e término. Neste treinamento, utilize somente conteúdo fictício.', action: 'continue' },
    { id: 'notifications', target: '[data-tour="agenda-notifications"]', title: 'Destinatários e mensagem', objective: 'Configure os avisos permitidos.', narration: 'Nesta seção, escolha quem receberá o aviso, defina se haverá lembretes e selecione o intervalo desejado. Use somente destinatários e mensagens de demonstração.', action: 'continue' },
    { id: 'save', target: '[data-tour="agenda-save"]', title: 'Revisão do evento', objective: 'Localize o cadastro final.', narration: 'Antes de cadastrar, revise o título, o período, os destinatários e os lembretes. Neste tutorial, apenas localize o botão de cadastro. Nenhum evento será criado.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'agenda-notificacoes');
