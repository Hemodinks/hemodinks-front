import type { TeamIdentificationMode } from '../../types';

export const TEAM_IDENTIFICATION_OPTIONS: Array<{
  value: TeamIdentificationMode;
  label: string;
  description: string;
}> = [
  {
    value: 'Pin',
    label: 'Seleção com PIN (recomendado)',
    description:
      'O funcionário seleciona o próprio nome e informa um PIN individual de 6 dígitos. Permite identificar a autoria e liberar ações sensíveis.',
  },
  {
    value: 'Selecao',
    label: 'Seleção sem PIN',
    description:
      'O funcionário seleciona o próprio nome, sem PIN. A autoria é identificada e as operações permitidas para a equipe ficam disponíveis.',
  },
  {
    value: 'Nenhuma',
    label: 'Sem identificação individual',
    description:
      'A equipe entra diretamente com a conta coletiva, sem escolher um funcionário. Não há identificação individual das ações.',
  },
];

export function getTeamIdentificationDescription(
  mode: TeamIdentificationMode,
) {
  return (
    TEAM_IDENTIFICATION_OPTIONS.find((option) => option.value === mode)
      ?.description ?? ''
  );
}
