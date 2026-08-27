import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';
import type { Team } from '../../types';
import { Button } from '../../shared/components/ui';
import type { ClinicTeamsState } from './useClinicTeams';

export function TeamMemberList({ team, state }: { team: Team; state: ClinicTeamsState }) {
  return (
    <ul className="team-member-list">
      {team.membros.map((member) => {
        const temporaryPin = state.temporaryPins[member.operadorId];
        const pinVisible = state.visiblePins[member.operadorId];
        return <li key={member.userId}>
          <span><strong>{member.nome}</strong><small>{member.email}</small></span>
          <div className="button-row">
            {team.modoIdentificacao === 'Pin' && <>
              <div className="team-pin-display">
                <span aria-live="polite">{temporaryPin ? pinVisible ? temporaryPin : '••••••' : member.possuiPin ? '••••••' : 'Sem PIN'}</span>
                <button type="button" disabled={!temporaryPin} aria-label={pinVisible ? `Ocultar PIN de ${member.nome}` : `Exibir PIN de ${member.nome}`} title={temporaryPin ? 'Exibir ou ocultar PIN temporário' : 'Redefina o PIN para poder visualizá-lo'} onClick={() => state.togglePinVisibility(member.operadorId)}>{pinVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              <Button onClick={() => void state.resetPin(team, member.operadorId)}><KeyRound size={15} />Novo PIN</Button>
            </>}
            <Button variant="danger-ghost" onClick={() => void state.removeMember(team, member.userId)}><Trash2 size={15} />Desassociar</Button>
          </div>
        </li>;
      })}
    </ul>
  );
}
