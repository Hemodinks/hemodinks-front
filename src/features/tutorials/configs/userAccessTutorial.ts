import type { TutorialConfig } from '../tutorialTypes';
export const userAccessTutorial = {
  id: 'user-access', view: 'users', title: 'Missão: gerir usuários e perfis', description: 'Cadastre uma conta e entenda o perfil de acesso.',
  steps: [
    { id: 'list', target: '[data-tour="users-list"]', title: 'Usuários autorizados', objective: 'Conheça a base de contas da clínica.', narration: 'Esta lista reúne as contas da clínica conforme a sua permissão administrativa.', action: 'continue' },
    { id: 'new', target: '[data-tour="users-new"]', title: 'Novo usuário', objective: 'Clique para abrir o cadastro.', narration: 'Clique em Novo usuário para abrir uma conta fictícia de treinamento.', action: 'click' },
    { id: 'profile', target: '[data-tour="users-profile"]', title: 'Perfil de acesso', objective: 'Entenda a escolha do perfil.', narration: 'O perfil define o alcance funcional da conta. Escolha somente o necessário para a função exercida.', action: 'continue' },
    { id: 'form', target: '[data-tour="users-form"]', title: 'Dados da conta', objective: 'Revise os dados cadastrais.', narration: 'Use nome, e-mail e demais informações totalmente fictícias durante a missão.', action: 'continue' },
    { id: 'save', target: '[data-tour="users-save"]', title: 'Revisar acesso', objective: 'Localize a ação final.', narration: 'Revise o perfil e os dados antes de cadastrar. A missão não cria a conta por você.', action: 'continue' },
  ],
} satisfies TutorialConfig;
