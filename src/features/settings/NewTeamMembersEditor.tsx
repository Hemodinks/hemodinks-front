import { Trash2 } from 'lucide-react';
import type { Team } from '../../types';
import type { ClinicTeamsState } from './useClinicTeams';
import { MAX_NAME_LENGTH, MAX_PHONE_LENGTH } from '../../shared/utils/formatterConstants';

export function NewTeamMembersEditor({ team, state }: { team: Team; state: ClinicTeamsState }) {
  const drafts = state.newUserDrafts[team.id] ?? [];
  if (!drafts.length) return null;
  return (
    <div className="new-team-users-editor">
      <small className="file-hint">Novos membros da equipe usarão o e-mail coletivo <strong>{team.email}</strong> e a senha da equipe.</small>
      {drafts.map((draft) => <div key={draft.id} className="new-team-user-row">
        <input aria-label={`Nome de ${draft.nome}`} value={draft.nome} maxLength={MAX_NAME_LENGTH} onChange={(event) => state.updateDraft(team.id, draft.id, 'nome', event.target.value.slice(0, MAX_NAME_LENGTH))} placeholder="Nome completo" />
        <input aria-label={`E-mail coletivo de ${draft.nome}`} type="email" value={team.email} readOnly title="Este funcionário usará o e-mail coletivo da equipe" />
        <input aria-label={`Telefone de ${draft.nome}`} type="tel" value={draft.telefone} maxLength={MAX_PHONE_LENGTH} onChange={(event) => state.updateDraft(team.id, draft.id, 'telefone', event.target.value.slice(0, MAX_PHONE_LENGTH))} placeholder="Telefone opcional" />
        <button type="button" aria-label={`Excluir ${draft.nome}`} onClick={() => state.removeDraft(team.id, draft.id)}><Trash2 size={16} /></button>
      </div>)}
    </div>
  );
}
