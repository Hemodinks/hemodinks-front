import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';

export const loginClinicTutorial = defineStaticAudioTutorial({
  id: 'login-clinic', view: 'login', title: 'Missão: acessar o HemoDinks',
  description: 'Entre com sua conta; a clínica é resolvida com segurança após a validação das credenciais.',
  steps: [
    { id: 'overview', target: '[data-tour="login-overview"]', title: 'Acesso seguro', objective: 'Conheça a entrada segura do HemoDinks.', narration: 'Esta é a tela de entrada do HemoDinks. Informe suas credenciais normalmente. A clínica autorizada será identificada pelo sistema depois da validação do acesso.', action: 'continue' },
    { id: 'email', target: '[data-tour="login-email"]', title: 'Identifique a conta', objective: 'Informe o e-mail fictício de homologação.', narration: 'Agora, clique no campo de e-mail. Digite apenas o endereço da conta fictícia preparada para este treinamento.', action: 'click' },
    { id: 'password', target: '[data-tour="login-password"]', title: 'Proteja a credencial', objective: 'Preencha a senha sem expô-la na gravação.', narration: 'Em seguida, clique no campo de senha. A senha fica protegida e nunca é pronunciada. Neste treinamento, utilize somente a credencial fictícia configurada no ambiente.', action: 'click' },
    { id: 'submit', target: '[data-tour="login-submit"]', title: 'Entrar com segurança', objective: 'Clique em Entrar para concluir.', narration: 'Por fim, confira o e-mail informado e clique em Entrar. O sistema validará a credencial, identificará as clínicas autorizadas e aplicará normalmente o perfil e as permissões desse acesso.', action: 'click' },
  ],
} satisfies TutorialConfig, 'login-clinica');
