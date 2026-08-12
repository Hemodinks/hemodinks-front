import type { TutorialConfig } from '../tutorialTypes';
export const clinicRegistrationTutorial = {
  id: 'clinic-registration', view: 'clinics', title: 'Missão: cadastrar uma clínica', description: 'Configure identidade, plano e administrador inicial.',
  steps: [
    { id: 'overview', target: '[data-tour="clinics-overview"]', title: 'Gestão da plataforma', objective: 'Reconheça a área exclusiva de clínicas.', narration: 'Esta área reúne as clínicas da plataforma e permanece restrita ao perfil autorizado.', action: 'continue' },
    { id: 'new', target: '[data-tour="clinics-new"]', title: 'Nova clínica', objective: 'Clique para abrir o cadastro.', narration: 'Clique em Nova clínica para iniciar um cadastro fictício e sanitizado.', action: 'click' },
    { id: 'identity', target: '[data-tour="clinics-identity"]', title: 'Identidade e plano', objective: 'Conheça os dados de identidade, assinatura e limites.', narration: 'Defina nome, slug, plano, assinatura e limites conforme a contratação. Use valores fictícios nesta missão.', action: 'continue' },
    { id: 'save', target: '[data-tour="clinics-save"]', title: 'Revisar antes de salvar', objective: 'Localize a ação final sem enviar dados incompletos.', narration: 'Revise todos os dados antes de salvar. A missão demonstra a ação sem criar uma clínica real.', action: 'continue' },
  ],
} satisfies TutorialConfig;
