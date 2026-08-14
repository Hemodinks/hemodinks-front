import type { TutorialConfig } from '../tutorialTypes';
import { defineStaticAudioTutorial } from '../tutorialNarration';
export const clinicSwitchTutorial = defineStaticAudioTutorial({
  id: 'clinic-switch', view: 'clinics', title: 'Missão: trocar de clínica', description: 'Alterne o tenant preservando a sessão autorizada.',
  steps: [
    { id: 'overview', target: '[data-tour="clinics-overview"]', title: 'Clínicas disponíveis', objective: 'Confira o tenant atual e as opções autorizadas.', narration: 'A troca de clínica está disponível somente para usuários autorizados. Ao trocar, o sistema muda o contexto da sessão e passa a trabalhar com o ambiente da clínica escolhida.', action: 'continue' },
    { id: 'list', target: '[data-tour="clinics-switch"]', title: 'Escolha o destino', objective: 'Localize a clínica fictícia desejada.', narration: 'Localize a clínica fictícia que deseja acessar. Antes de continuar, confira o nome, o plano e a situação da assinatura para evitar a escolha do ambiente errado.', action: 'continue' },
    { id: 'finish', target: '[data-tour="clinics-switch"]', title: 'Sessão atualizada', objective: 'Entenda o resultado da troca.', narration: 'Ao acessar outra clínica, o sistema solicita uma nova sessão e carrega somente os dados do ambiente selecionado. As permissões da conta continuam sendo respeitadas.', action: 'continue' },
  ],
} satisfies TutorialConfig, 'troca-clinica');
