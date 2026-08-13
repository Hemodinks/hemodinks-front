import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const userAccessTutorial = defineStaticAudioTutorial({
  id: 'user-access', view: 'users', title: 'Missão: gerir usuários e perfis', description: 'Cadastre uma conta e entenda o perfil de acesso.',
  steps: [
    { id: 'list', target: '[data-tour="users-list"]', title: 'Usuários autorizados', objective: 'Conheça a base de contas da clínica.', narration: 'Esta lista reúne as contas vinculadas à clínica. O que você pode visualizar ou alterar depende da sua permissão administrativa.', action: 'continue' },
    { id: 'new', target: '[data-tour="users-new"]', title: 'Novo usuário', objective: 'Clique para abrir o cadastro.', narration: 'Clique em Novo usuário para abrir o formulário. Neste treinamento, vamos utilizar uma conta totalmente fictícia.', action: 'click' },
    { id: 'profile', target: '[data-tour="users-profile"]', title: 'Perfil de acesso', objective: 'Entenda a escolha do perfil.', narration: 'O perfil de acesso define quais módulos e ações estarão disponíveis para a conta. Aplique o princípio do menor privilégio: conceda somente o acesso necessário para a função do usuário.', action: 'continue' },
    { id: 'form', target: '[data-tour="users-form"]', title: 'Dados da conta', objective: 'Revise os dados cadastrais.', narration: 'Preencha os dados da conta e confira os campos obrigatórios. Durante esta demonstração, utilize apenas nome, e-mail e demais informações fictícias.', action: 'continue' },
    { id: 'save', target: '[data-tour="users-save"]', title: 'Revisar acesso', objective: 'Localize a ação final.', narration: 'Antes de cadastrar, revise os dados e confirme se o perfil escolhido é realmente necessário. Neste tutorial, apenas localize o botão. A conta não será criada.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'usuarios-perfis');
