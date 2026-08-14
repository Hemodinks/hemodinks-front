import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const clinicRegistrationTutorial = defineStaticAudioTutorial({
  id: 'clinic-registration', view: 'clinics', title: 'Missão: cadastrar uma clínica', description: 'Configure identidade, plano e administrador inicial.',
  steps: [
    { id: 'overview', target: '[data-tour="clinics-overview"]', title: 'Gestão da plataforma', objective: 'Reconheça a área exclusiva de clínicas.', narration: 'Esta tela reúne as clínicas cadastradas na plataforma. Por segurança, somente usuários com permissão administrativa podem visualizar e alterar essas informações.', action: 'continue' },
    { id: 'new', target: '[data-tour="clinics-new"]', title: 'Nova clínica', objective: 'Clique para abrir o cadastro.', narration: 'Para começar, clique em Nova clínica. O sistema abrirá o formulário de cadastro. Durante este tutorial, utilize somente informações fictícias.', action: 'click' },
    { id: 'identity', target: '[data-tour="clinics-identity"]', title: 'Identidade e plano', objective: 'Conheça os dados de identidade, assinatura e limites.', narration: 'Nesta seção, informe o nome da clínica e o endereço amigável usado pelo sistema. Depois, selecione o plano, a situação da assinatura e os limites contratados. Confira cada opção antes de continuar.', action: 'continue' },
    { id: 'save', target: '[data-tour="clinics-save"]', title: 'Revisar antes de salvar', objective: 'Localize a ação final sem enviar dados incompletos.', narration: 'Antes de salvar, revise os campos obrigatórios, os módulos liberados e os limites da clínica. Neste treinamento, apenas localize o botão. Nenhuma clínica real será criada.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'cadastro-clinica');
