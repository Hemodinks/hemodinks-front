import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const patientRegistrationTutorial = defineStaticAudioTutorial({
  id: 'patient-registration', view: 'patients', title: 'Missão: cadastrar um paciente', description: 'Abra o formulário e reconheça os campos essenciais.',
  steps: [
    { id: 'list', target: '[data-tour="patients-list"]', title: 'Base de pacientes', objective: 'Conheça a lista de registros autorizados.', narration: 'Esta lista apresenta somente os registros que o seu perfil pode consultar. Você pode pesquisar um cadastro existente ou iniciar um novo. Neste treinamento, todos os exemplos são fictícios.', action: 'continue' },
    { id: 'new', target: '[data-tour="patients-new"]', title: 'Novo paciente', objective: 'Clique para abrir o formulário.', narration: 'Clique em Novo paciente. O formulário será aberto para você conhecer as informações necessárias ao cadastro.', action: 'click' },
    { id: 'identity', target: '[data-tour="patients-identification"]', title: 'Dados do atendimento', objective: 'Reconheça os campos do paciente e do atendimento.', narration: 'Comece pelos dados do paciente e pelas datas da solicitação e do atendimento. Em seguida, informe o convênio e o contexto operacional. Use somente informações fictícias nesta demonstração.', action: 'continue' },
    { id: 'save', target: '[data-tour="patients-save"]', title: 'Cadastro revisado', objective: 'Localize o botão de cadastro.', narration: 'Antes de cadastrar, confira os campos obrigatórios e verifique se os dados estão corretos. Neste tutorial, apenas localize o botão de cadastro. Nenhuma informação será enviada.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'cadastro-paciente');
