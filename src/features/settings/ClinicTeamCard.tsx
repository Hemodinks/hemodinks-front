import { RefreshCw } from 'lucide-react';
import type { Team, TeamIdentificationMode } from '../../types';
import { Button } from '../../shared/components/ui';
import { getTeamIdentificationDescription, TEAM_IDENTIFICATION_OPTIONS } from '../../shared/utils/teamIdentification';
import type { ClinicTeamsState } from './useClinicTeams';
import { TeamMemberSelector } from './TeamMemberSelector';
import { NewTeamMembersEditor } from './NewTeamMembersEditor';
import { TeamMemberList } from './TeamMemberList';

export function ClinicTeamCard({ team, state }: { team: Team; state: ClinicTeamsState }) {
  const noPendingMembers = (state.selectedMembers[team.id] ?? []).length === 0 && (state.newUserDrafts[team.id] ?? []).length === 0;
  return (
    <section className="session-card">
      <div className="data-header">
        <div className="clinic-team-identity"><strong>{team.nome}</strong><small>{team.email}</small></div>
        <label>Modo<select value={team.modoIdentificacao} onChange={(event) => void state.changeMode(team, event.target.value as TeamIdentificationMode)}>{TEAM_IDENTIFICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <small className="file-hint">{getTeamIdentificationDescription(team.modoIdentificacao)}</small>
      <div className="team-association-controls">
        <TeamMemberSelector team={team} state={state} />
        <NewTeamMembersEditor team={team} state={state} />
        <div className="team-association-actions">
          <label className="team-pin-option"><input type="checkbox" checked={team.modoIdentificacao === 'Pin' && (state.generatePins[team.id] ?? true)} onChange={(event) => state.setGeneratePin(team.id, event.target.checked)} disabled={team.modoIdentificacao !== 'Pin'} />Gerar PIN individual</label>
          <Button onClick={() => void state.associate(team)} disabled={noPendingMembers || state.loading}>Associar selecionados</Button>
          <Button onClick={() => void state.load()}><RefreshCw size={16} />Atualizar</Button>
        </div>
      </div>
      <TeamMemberList team={team} state={state} />
    </section>
  );
}
