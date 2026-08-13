import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';

export const loginClinicTutorial = defineStaticAudioTutorial({
  id: 'login-clinic', view: 'login', title: 'Missão: entrar na clínica correta',
  description: 'Selecione a clínica correta antes de entrar com sua conta.',
  steps: [
    { id: 'overview', target: '[data-tour="login-overview"]', title: 'Acesso multiclínica', objective: 'Conheça a entrada segura do HemoDinks.', narration: 'Esta é a tela de entrada do HemoDinks. Antes de informar seus dados de acesso, confirme em qual clínica você deseja entrar. Cada clínica possui seu próprio ambiente e suas próprias permissões.', action: 'continue' },
    { id: 'clinic', target: '[data-tour="login-clinic"]', title: 'Escolha a clínica', objective: 'Selecione a clínica fictícia de homologação.', narration: 'Primeiro, abra esta lista e selecione a clínica fictícia autorizada para o treinamento. O tutorial avançará somente depois dessa escolha.', action: 'click' },
    { id: 'email', target: '[data-tour="login-email"]', title: 'Identifique a conta', objective: 'Informe o e-mail fictício de homologação.', narration: 'Agora, clique no campo de e-mail. Digite apenas o endereço da conta fictícia preparada para este treinamento.', action: 'click' },
    { id: 'password', target: '[data-tour="login-password"]', title: 'Proteja a credencial', objective: 'Preencha a senha sem expô-la na gravação.', narration: 'Em seguida, clique no campo de senha. A senha fica protegida e nunca é pronunciada. Neste treinamento, utilize somente a credencial fictícia configurada no ambiente.', action: 'click' },
    { id: 'submit', target: '[data-tour="login-submit"]', title: 'Entrar com segurança', objective: 'Clique em Entrar para concluir.', narration: 'Por fim, confira a clínica e o e-mail informados. Depois, clique em Entrar. O sistema validará a conta e aplicará normalmente as permissões desse usuário.', action: 'click' },
  ],
} satisfies TutorialConfig, 'login-clinica');
