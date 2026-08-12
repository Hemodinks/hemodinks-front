import type { TutorialConfig } from '../tutorialTypes';
export const patientRegistrationTutorial = {
  id: 'patient-registration', view: 'patients', title: 'Missão: cadastrar um paciente', description: 'Abra o formulário e reconheça os campos essenciais.',
  steps: [
    { id: 'list', target: '[data-tour="patients-list"]', title: 'Base de pacientes', objective: 'Conheça a lista de registros autorizados.', narration: 'A base apresenta somente registros permitidos para o seu perfil. No treinamento, todos os dados devem ser fictícios.', action: 'continue' },
    { id: 'new', target: '[data-tour="patients-new"]', title: 'Novo paciente', objective: 'Clique para abrir o formulário.', narration: 'Clique em Novo paciente para iniciar o cadastro sanitizado.', action: 'click' },
    { id: 'identity', target: '[data-tour="patients-identification"]', title: 'Dados do atendimento', objective: 'Reconheça os campos do paciente e do atendimento.', narration: 'Preencha apenas informações fictícias de paciente, datas, convênio e contexto do atendimento.', action: 'continue' },
    { id: 'save', target: '[data-tour="patients-save"]', title: 'Cadastro revisado', objective: 'Localize o botão de cadastro.', narration: 'Antes de cadastrar, revise os campos obrigatórios e confirme que nenhum dado real foi usado.', action: 'continue' },
  ],
} satisfies TutorialConfig;
