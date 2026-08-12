import type { TutorialConfig } from '../tutorialTypes';

export const loginClinicTutorial = {
  id: 'login-clinic', view: 'login', title: 'Missão: entrar na clínica correta',
  description: 'Selecione a clínica antes de autenticar sua conta no ambiente SaaS.',
  steps: [
    { id: 'overview', target: '[data-tour="login-overview"]', title: 'Acesso multiclínica', objective: 'Conheça a entrada segura do Hemodinks.', narration: 'Esta é a entrada do Hemodinks. Cada acesso começa pela escolha da clínica correta e usa apenas as credenciais vinculadas a ela.', action: 'continue' },
    { id: 'clinic', target: '[data-tour="login-clinic"]', title: 'Escolha a clínica', objective: 'Selecione a clínica fictícia de homologação.', narration: 'Selecione primeiro a clínica fictícia autorizada para o treinamento.', action: 'click' },
    { id: 'email', target: '[data-tour="login-email"]', title: 'Identifique a conta', objective: 'Informe o e-mail fictício de homologação.', narration: 'Informe somente o e-mail da conta fictícia preparada para esta missão.', action: 'click' },
    { id: 'password', target: '[data-tour="login-password"]', title: 'Proteja a credencial', objective: 'Preencha a senha sem expô-la na gravação.', narration: 'A senha nunca é narrada, exibida ou gravada. Use apenas a credencial fictícia configurada no ambiente.', action: 'click' },
    { id: 'submit', target: '[data-tour="login-submit"]', title: 'Entrar com segurança', objective: 'Clique em Entrar para concluir.', narration: 'Confira a clínica selecionada e clique em Entrar. A autenticação continua seguindo as regras normais do sistema.', action: 'click' },
  ],
} satisfies TutorialConfig;
