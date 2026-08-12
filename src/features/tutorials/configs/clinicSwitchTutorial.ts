import type { TutorialConfig } from '../tutorialTypes';
export const clinicSwitchTutorial = {
  id: 'clinic-switch', view: 'clinics', title: 'Missão: trocar de clínica', description: 'Alterne o tenant preservando a sessão autorizada.',
  steps: [
    { id: 'overview', target: '[data-tour="clinics-overview"]', title: 'Clínicas disponíveis', objective: 'Confira o tenant atual e as opções autorizadas.', narration: 'A troca de clínica está disponível somente para perfis autorizados e substitui o contexto da sessão.', action: 'continue' },
    { id: 'list', target: '[data-tour="clinics-switch"]', title: 'Escolha o destino', objective: 'Localize a clínica fictícia desejada.', narration: 'Localize a clínica fictícia de destino e confira nome, plano e status antes de trocar.', action: 'continue' },
    { id: 'finish', target: '[data-tour="clinics-switch"]', title: 'Sessão atualizada', objective: 'Entenda o resultado da troca.', narration: 'Ao acessar outra clínica, o sistema obtém uma nova sessão e recarrega somente os dados do tenant selecionado.', action: 'continue' },
  ],
} satisfies TutorialConfig;
